import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:intl/intl.dart';
import '../../models/subscription_model.dart';
import '../../utils/app_colors.dart';

class AdminSubscriptionScreen extends StatefulWidget {
  const AdminSubscriptionScreen({super.key});

  @override
  State<AdminSubscriptionScreen> createState() =>
      _AdminSubscriptionScreenState();
}

class _AdminSubscriptionScreenState extends State<AdminSubscriptionScreen> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  String _filterStatus = 'all'; // all, active, expired

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 통계 카드
        _buildStatsSection(),
        // 필터
        _buildFilterChips(),
        // 구독자 목록
        Expanded(
          child: _buildSubscriptionList(),
        ),
      ],
    );
  }

  Widget _buildStatsSection() {
    return StreamBuilder<QuerySnapshot>(
      stream: _firestore.collection('subscriptions').snapshots(),
      builder: (context, snapshot) {
        int totalCount = 0;
        int activeCount = 0;
        int expiredCount = 0;

        if (snapshot.hasData) {
          final docs = snapshot.data!.docs;
          totalCount = docs.length;

          for (var doc in docs) {
            final data = doc.data() as Map<String, dynamic>;
            final status = data['status'] as String?;
            if (status == 'active') {
              activeCount++;
            } else if (status == 'expired') {
              expiredCount++;
            }
          }
        }

        return Container(
          margin: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  '전체',
                  totalCount.toString(),
                  AppColors.info,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  '활성',
                  activeCount.toString(),
                  const Color(0xFF4CAF50),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  '만료',
                  expiredCount.toString(),
                  const Color(0xFFFF9800),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatCard(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _buildFilterChip('all', '전체'),
          const SizedBox(width: 8),
          _buildFilterChip('active', '활성'),
          const SizedBox(width: 8),
          _buildFilterChip('expired', '만료'),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String status, String label) {
    final isSelected = _filterStatus == status;
    return GestureDetector(
      onTap: () {
        setState(() {
          _filterStatus = status;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentDeep : AppColors.inputBackground,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  Widget _buildSubscriptionList() {
    Query query = _firestore
        .collection('subscriptions')
        .orderBy('endDate', descending: true);

    if (_filterStatus != 'all') {
      query = query.where('status', isEqualTo: _filterStatus);
    }

    return StreamBuilder<QuerySnapshot>(
      stream: query.snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(
                  '데이터를 불러오는데 실패했습니다\n${snapshot.error}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textSecondary),
                ),
              ],
            ),
          );
        }

        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.card_membership_outlined,
                  size: 64,
                  color: AppColors.textSecondary.withValues(alpha: 0.3),
                ),
                const SizedBox(height: 16),
                const Text(
                  '구독 내역이 없습니다',
                  style: TextStyle(
                    fontSize: 16,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
          );
        }

        final subscriptions = snapshot.data!.docs;

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: subscriptions.length,
          itemBuilder: (context, index) {
            final doc = subscriptions[index];
            final data = doc.data() as Map<String, dynamic>;
            return _buildSubscriptionCard(doc.id, data);
          },
        );
      },
    );
  }

  Widget _buildSubscriptionCard(String docId, Map<String, dynamic> data) {
    final userId = data['userId'] as String? ?? '';
    final planId = data['planId'] as String? ?? '';
    final status = data['status'] as String? ?? 'free';
    final platform = data['platform'] as String? ?? '';
    final startDate = (data['startDate'] as Timestamp?)?.toDate();
    final endDate = (data['endDate'] as Timestamp?)?.toDate();

    final plan =
        SubscriptionPlan.defaultPlans.where((p) => p.id == planId).firstOrNull;
    final planName = plan?.name ?? planId;

    final isActive = status == 'active' &&
        endDate != null &&
        endDate.isAfter(DateTime.now());
    final remainingDays =
        endDate != null ? endDate.difference(DateTime.now()).inDays : 0;

    return FutureBuilder<DocumentSnapshot>(
      future: _firestore.collection('users').doc(userId).get(),
      builder: (context, userSnapshot) {
        String userName = '알 수 없음';
        String userEmail = '';

        if (userSnapshot.hasData && userSnapshot.data!.exists) {
          final userData = userSnapshot.data!.data() as Map<String, dynamic>?;
          userName = userData?['name'] ?? '알 수 없음';
          userEmail = userData?['email'] ?? '';
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isActive
                  ? const Color(0xFF4CAF50).withValues(alpha: 0.3)
                  : AppColors.divider,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 헤더: 사용자 정보 + 상태
                Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: isActive
                            ? const Color(0xFF4CAF50).withValues(alpha: 0.1)
                            : AppColors.inputBackground,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        isActive ? Icons.verified : Icons.person_outline,
                        color: isActive
                            ? const Color(0xFF4CAF50)
                            : AppColors.textSecondary,
                        size: 22,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            userName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          if (userEmail.isNotEmpty)
                            Text(
                              userEmail,
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                              ),
                            ),
                        ],
                      ),
                    ),
                    _buildStatusBadge(status, isActive),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(height: 1, color: AppColors.divider),
                const SizedBox(height: 16),
                // 구독 정보
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        Icons.card_membership,
                        '플랜',
                        planName,
                      ),
                    ),
                    Expanded(
                      child: _buildInfoItem(
                        Icons.phone_iphone,
                        '플랫폼',
                        platform.toUpperCase(),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildInfoItem(
                        Icons.calendar_today,
                        '시작일',
                        startDate != null
                            ? DateFormat('yyyy.MM.dd').format(startDate)
                            : '-',
                      ),
                    ),
                    Expanded(
                      child: _buildInfoItem(
                        Icons.event,
                        '만료일',
                        endDate != null
                            ? DateFormat('yyyy.MM.dd').format(endDate)
                            : '-',
                      ),
                    ),
                  ],
                ),
                if (isActive && remainingDays >= 0) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF4CAF50).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.timer_outlined,
                          size: 16,
                          color: Color(0xFF4CAF50),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          '남은 기간: $remainingDays일',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF4CAF50),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
                // 관리 버튼
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _showExtendDialog(docId, endDate),
                        icon: const Icon(Icons.add_circle_outline, size: 18),
                        label: const Text('기간 연장'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF4CAF50),
                          side: const BorderSide(color: Color(0xFF4CAF50)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: isActive
                            ? () => _showBlockDialog(docId, userName)
                            : null,
                        icon: const Icon(Icons.block, size: 18),
                        label: const Text('이용 차단'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFF44336),
                          side: BorderSide(
                            color: isActive
                                ? const Color(0xFFF44336)
                                : AppColors.divider,
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showExtendDialog(String docId, DateTime? currentEndDate) {
    int selectedDays = 30;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('구독 기간 연장'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '연장할 기간을 선택하세요:',
                style: TextStyle(color: AppColors.textSecondary),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildDayChip(7, selectedDays, (days) {
                    setDialogState(() => selectedDays = days);
                  }),
                  _buildDayChip(30, selectedDays, (days) {
                    setDialogState(() => selectedDays = days);
                  }),
                  _buildDayChip(90, selectedDays, (days) {
                    setDialogState(() => selectedDays = days);
                  }),
                  _buildDayChip(180, selectedDays, (days) {
                    setDialogState(() => selectedDays = days);
                  }),
                  _buildDayChip(365, selectedDays, (days) {
                    setDialogState(() => selectedDays = days);
                  }),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.inputBackground,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline,
                        size: 18, color: AppColors.textSecondary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '새 만료일: ${DateFormat('yyyy.MM.dd').format((currentEndDate ?? DateTime.now()).add(Duration(days: selectedDays)))}',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('취소'),
            ),
            ElevatedButton(
              onPressed: () =>
                  _extendSubscription(docId, currentEndDate, selectedDays),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4CAF50),
              ),
              child: const Text('연장', style: TextStyle(color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDayChip(int days, int selectedDays, Function(int) onSelect) {
    final isSelected = days == selectedDays;
    String label;
    if (days == 7) {
      label = '1주';
    } else if (days == 30) {
      label = '1개월';
    } else if (days == 90) {
      label = '3개월';
    } else if (days == 180) {
      label = '6개월';
    } else if (days == 365) {
      label = '1년';
    } else {
      label = '$days일';
    }

    return GestureDetector(
      onTap: () => onSelect(days),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.accentDeep : AppColors.inputBackground,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }

  Future<void> _extendSubscription(
      String docId, DateTime? currentEndDate, int days) async {
    Navigator.pop(context);

    try {
      final baseDate = currentEndDate ?? DateTime.now();
      final newEndDate = baseDate.add(Duration(days: days));

      await _firestore.collection('subscriptions').doc(docId).update({
        'endDate': Timestamp.fromDate(newEndDate),
        'status': 'active',
        'grantedDays': days,
        'sourceType': 'admin',
        'updatedAt': Timestamp.now(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('구독이 $days일 연장되었습니다'),
            backgroundColor: const Color(0xFF4CAF50),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('연장 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showBlockDialog(String docId, String userName) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('이용 차단'),
        content: Text(
          '$userName님의 이용을 차단하시겠습니까?\n\n즉시 서비스 이용이 불가능해집니다.',
          style: const TextStyle(height: 1.5),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('아니오'),
          ),
          ElevatedButton(
            onPressed: () => _blockSubscription(docId),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFF44336),
            ),
            child: const Text('차단하기', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _blockSubscription(String docId) async {
    Navigator.pop(context);

    try {
      await _firestore.collection('subscriptions').doc(docId).update({
        'status': 'expired',
        'endDate': Timestamp.now(),
        'updatedAt': Timestamp.now(),
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('이용이 차단되었습니다'),
            backgroundColor: Color(0xFFF44336),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('차단 실패: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildStatusBadge(String status, bool isActive) {
    Color color;
    String label;

    if (isActive) {
      color = const Color(0xFF4CAF50);
      label = '활성';
    } else if (status == 'expired') {
      color = const Color(0xFFFF9800);
      label = '만료';
    } else if (status == 'cancelled') {
      color = const Color(0xFFF44336);
      label = '취소';
    } else {
      color = AppColors.textSecondary;
      label = '무료';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildInfoItem(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: AppColors.textSecondary,
        ),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.textSecondary,
              ),
            ),
            Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
