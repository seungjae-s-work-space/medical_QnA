import 'package:cloud_firestore/cloud_firestore.dart';

class PaginatedResult<T> {
  final List<T> items;
  final DocumentSnapshot? lastDocument;
  final bool hasMore;

  const PaginatedResult({
    required this.items,
    required this.lastDocument,
    required this.hasMore,
  });
}
