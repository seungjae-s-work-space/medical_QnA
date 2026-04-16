import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../utils/app_colors.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isLogin = true;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);

    bool success;
    if (_isLogin) {
      success = await authProvider.signIn(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
    } else {
      success = await authProvider.signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        name: _nameController.text.trim(),
      );
    }

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage ?? '오류가 발생했습니다'),
          backgroundColor: AppColors.textSecondary,
        ),
      );
    } else if (success && mounted && !_isLogin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('인증 메일을 보냈습니다. 메일함에서 링크를 눌러주세요.'),
          backgroundColor: Color(0xFFB87BA8),
        ),
      );
    }
  }

  Future<void> _showPasswordResetDialog() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    String resetEmail = _emailController.text.trim();
    String? localError;
    bool sending = false;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              title: const Text(
                '비밀번호 찾기',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                ),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    '가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드릴게요.',
                    style: TextStyle(
                      fontSize: 14,
                      color: AppColors.textSecondary,
                      height: 1.6,
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    initialValue: resetEmail,
                    keyboardType: TextInputType.emailAddress,
                    onChanged: (value) {
                      resetEmail = value;
                      if (localError != null) {
                        setState(() {
                          localError = null;
                        });
                      }
                    },
                    decoration: InputDecoration(
                      hintText: '이메일 주소',
                      errorText: localError,
                      filled: true,
                      fillColor: const Color(0xFFF5F5F5),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(18),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed:
                      sending ? null : () => Navigator.of(dialogContext).pop(),
                  child: const Text(
                    '취소',
                    style: TextStyle(color: AppColors.textSecondary),
                  ),
                ),
                ElevatedButton(
                  onPressed: sending
                      ? null
                      : () async {
                          final navigator = Navigator.of(dialogContext);
                          final messenger = ScaffoldMessenger.of(this.context);
                          final email = resetEmail.trim();
                          if (email.isEmpty || !email.contains('@')) {
                            setState(() {
                              localError = '올바른 이메일을 입력해주세요';
                            });
                            return;
                          }

                          setState(() {
                            localError = null;
                            sending = true;
                          });

                          final success =
                              await authProvider.sendPasswordResetEmail(email);

                          if (!mounted) return;

                          setState(() {
                            sending = false;
                          });

                          if (success) {
                            navigator.pop();
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text(
                                  '비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해주세요.',
                                ),
                                backgroundColor: Color(0xFFB87BA8),
                              ),
                            );
                          } else {
                            setState(() {
                              localError = authProvider.errorMessage ??
                                  '재설정 메일 발송에 실패했습니다';
                            });
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFB87BA8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: sending
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text(
                          '메일 보내기',
                          style: TextStyle(color: Colors.white),
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 60),

                  // 로고 이미지
                  Image.asset(
                    'assets/images/loginlogo4xreal.png',
                    height: 80,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 24),

                  // 서브 타이틀
                  Text(
                    _isLogin ? '난임시술, 이제 혼자 고민하지 마세요' : '새 계정을 만들어주세요',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 16,
                      color: AppColors.textSecondary,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 48),

                  // 이름 필드 (회원가입시에만)
                  if (!_isLogin) ...[
                    _buildInputField(
                      controller: _nameController,
                      hintText: '이름',
                      icon: Icons.person_outline,
                      validator: (value) {
                        if (!_isLogin && (value == null || value.isEmpty)) {
                          return '이름을 입력해주세요';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                  ],

                  // 이메일 필드
                  _buildInputField(
                    controller: _emailController,
                    hintText: '이메일',
                    icon: Icons.email_outlined,
                    keyboardType: TextInputType.emailAddress,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return '이메일을 입력해주세요';
                      }
                      if (!value.contains('@')) {
                        return '올바른 이메일을 입력해주세요';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // 비밀번호 필드
                  _buildInputField(
                    controller: _passwordController,
                    hintText: '비밀번호',
                    icon: Icons.lock_outline,
                    obscureText: _obscurePassword,
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off
                            : Icons.visibility,
                        color: AppColors.textTertiary,
                        size: 20,
                      ),
                      onPressed: () {
                        setState(() {
                          _obscurePassword = !_obscurePassword;
                        });
                      },
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return '비밀번호를 입력해주세요';
                      }
                      if (value.length < 6) {
                        return '비밀번호는 최소 6자 이상이어야 합니다';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 32),

                  // 제출 버튼
                  SizedBox(
                    height: 56,
                    child: ElevatedButton(
                      onPressed: authProvider.isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFB87BA8),
                        disabledBackgroundColor: const Color(0xFFE0E0E0),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28),
                        ),
                        elevation: 0,
                      ),
                      child: authProvider.isLoading
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              _isLogin ? '로그인' : '회원가입',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                                letterSpacing: 1,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 토글 버튼
                  TextButton(
                    onPressed: () {
                      setState(() {
                        _isLogin = !_isLogin;
                      });
                    },
                    child: RichText(
                      text: TextSpan(
                        style: const TextStyle(fontSize: 15),
                        children: [
                          TextSpan(
                            text: _isLogin ? '계정이 없으신가요? ' : '이미 계정이 있으신가요? ',
                            style:
                                const TextStyle(color: AppColors.textSecondary),
                          ),
                          TextSpan(
                            text: _isLogin ? '회원가입' : '로그인',
                            style: const TextStyle(
                              color: Color(0xFFB87BA8),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  if (_isLogin)
                    TextButton(
                      onPressed: authProvider.isLoading
                          ? null
                          : _showPasswordResetDialog,
                      child: const Text(
                        '비밀번호를 잊으셨나요?',
                        style: TextStyle(
                          fontSize: 15,
                          color: Color(0xFFB87BA8),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),

                  if (_isLogin) const SizedBox(height: 8),

                  // 둘러보기 버튼 (게스트 모드)
                  TextButton(
                    onPressed: () {
                      authProvider.enterGuestMode();
                    },
                    child: const Text(
                      '로그인 없이 둘러보기',
                      style: TextStyle(
                        fontSize: 15,
                        color: AppColors.textTertiary,
                        decoration: TextDecoration.underline,
                      ),
                    ),
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hintText,
    IconData? icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscureText,
      style: const TextStyle(
        fontSize: 18,
        color: AppColors.textPrimary,
      ),
      decoration: InputDecoration(
        hintText: hintText,
        hintStyle: const TextStyle(
          color: AppColors.textTertiary,
          fontSize: 17,
        ),
        filled: true,
        fillColor: const Color(0xFFF5F5F5),
        prefixIcon: icon != null
            ? Container(
                margin: const EdgeInsets.only(left: 16, right: 12),
                child: Icon(icon, color: const Color(0xFFB87BA8), size: 22),
              )
            : null,
        prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
        suffixIcon: suffixIcon,
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: const BorderSide(color: Color(0xFFB87BA8), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide(color: Colors.red.shade300),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(24),
          borderSide: BorderSide(color: Colors.red.shade300),
        ),
      ),
      validator: validator,
    );
  }
}
