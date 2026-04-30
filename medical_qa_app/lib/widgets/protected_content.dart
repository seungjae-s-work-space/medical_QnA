import 'package:flutter/widgets.dart';

class ProtectedContent extends StatelessWidget {
  const ProtectedContent({
    super.key,
    required this.child,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SelectionContainer.disabled(child: child);
  }
}
