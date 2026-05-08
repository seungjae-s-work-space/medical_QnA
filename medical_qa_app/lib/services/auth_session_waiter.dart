import 'dart:async';

class AuthSessionWaiter<T extends Object> {
  const AuthSessionWaiter({
    required this.currentUser,
    required this.authStateChanges,
    this.onError,
  });

  final T? Function() currentUser;
  final Stream<T?> authStateChanges;
  final void Function(Object error, StackTrace stackTrace)? onError;

  Future<T?> wait({
    required Duration timeout,
    required Duration retryDelay,
    Duration? nullEventGracePeriod,
  }) async {
    final existingUser = currentUser();
    if (existingUser != null) return existingUser;
    if (timeout <= Duration.zero) return null;

    final pollDelay = retryDelay > Duration.zero
        ? retryDelay
        : const Duration(milliseconds: 50);
    final deadline = DateTime.now().add(timeout);

    T? latestAuthEventUser;
    late final StreamSubscription<T?> subscription;
    subscription = authStateChanges.listen(
      (user) {
        if (user != null) {
          latestAuthEventUser = user;
        }
      },
      onError: onError,
    );

    try {
      while (DateTime.now().isBefore(deadline)) {
        final polledUser = currentUser();
        if (polledUser != null) return polledUser;
        if (latestAuthEventUser != null) return latestAuthEventUser;

        await Future<void>.delayed(
          _shorter(pollDelay, deadline.difference(DateTime.now())),
        );
      }

      return currentUser() ?? latestAuthEventUser;
    } finally {
      await subscription.cancel();
    }
  }

  Duration _shorter(Duration a, Duration b) {
    if (b <= Duration.zero) return Duration.zero;
    return a < b ? a : b;
  }
}
