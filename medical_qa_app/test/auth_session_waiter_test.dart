import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:medical_qa_app/services/auth_session_waiter.dart';

void main() {
  test('returns the current user immediately when one already exists',
      () async {
    final controller = StreamController<_FakeUser?>.broadcast();
    const user = _FakeUser('user-1');
    final waiter = AuthSessionWaiter<_FakeUser>(
      currentUser: () => user,
      authStateChanges: controller.stream,
    );

    final restored = await waiter.wait(
      timeout: const Duration(seconds: 1),
      retryDelay: const Duration(milliseconds: 20),
    );

    expect(restored?.id, 'user-1');
    await controller.close();
  });

  test('returns null only after the restore timeout when no user appears',
      () async {
    final controller = StreamController<_FakeUser?>.broadcast();
    final waiter = AuthSessionWaiter<_FakeUser>(
      currentUser: () => null,
      authStateChanges: controller.stream,
    );
    final stopwatch = Stopwatch()..start();

    final waitFuture = waiter.wait(
      timeout: const Duration(milliseconds: 80),
      retryDelay: const Duration(milliseconds: 10),
    );
    await Future<void>.delayed(Duration.zero);
    controller.add(null);

    final restored = await waitFuture;
    stopwatch.stop();

    expect(restored, isNull);
    expect(
        stopwatch.elapsed,
        greaterThanOrEqualTo(
          const Duration(milliseconds: 70),
        ));
    await controller.close();
  });

  test('keeps waiting through null grace when a user appears', () async {
    final controller = StreamController<_FakeUser?>.broadcast();
    _FakeUser? currentUser;
    final waiter = AuthSessionWaiter<_FakeUser>(
      currentUser: () => currentUser,
      authStateChanges: controller.stream,
    );

    final waitFuture = waiter.wait(
      timeout: const Duration(seconds: 1),
      retryDelay: const Duration(milliseconds: 10),
      nullEventGracePeriod: const Duration(milliseconds: 60),
    );
    await Future<void>.delayed(Duration.zero);
    controller.add(null);
    await Future<void>.delayed(const Duration(milliseconds: 20));
    currentUser = const _FakeUser('user-1');

    final restored = await waitFuture;

    expect(restored?.id, 'user-1');
    await controller.close();
  });

  test('does not give up on a null event before the restore timeout', () async {
    final controller = StreamController<_FakeUser?>.broadcast();
    _FakeUser? currentUser;
    final waiter = AuthSessionWaiter<_FakeUser>(
      currentUser: () => currentUser,
      authStateChanges: controller.stream,
    );

    final waitFuture = waiter.wait(
      timeout: const Duration(milliseconds: 200),
      retryDelay: const Duration(milliseconds: 10),
      nullEventGracePeriod: const Duration(milliseconds: 20),
    );
    await Future<void>.delayed(Duration.zero);
    controller.add(null);
    await Future<void>.delayed(const Duration(milliseconds: 80));
    currentUser = const _FakeUser('user-1');

    final restored = await waitFuture;

    expect(restored?.id, 'user-1');
    await controller.close();
  });

  test('waits for current user when auth stream has not emitted yet', () async {
    final controller = StreamController<_FakeUser?>.broadcast();
    _FakeUser? currentUser;
    final waiter = AuthSessionWaiter<_FakeUser>(
      currentUser: () => currentUser,
      authStateChanges: controller.stream,
    );

    final waitFuture = waiter.wait(
      timeout: const Duration(seconds: 1),
      retryDelay: const Duration(milliseconds: 10),
    );
    await Future<void>.delayed(const Duration(milliseconds: 20));
    currentUser = const _FakeUser('user-1');

    final restored = await waitFuture;

    expect(restored?.id, 'user-1');
    await controller.close();
  });
}

class _FakeUser {
  const _FakeUser(this.id);

  final String id;
}
