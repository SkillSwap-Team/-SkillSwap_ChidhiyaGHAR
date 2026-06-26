import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import '../../../config/theme.dart';
import '../../../core/providers/auth_provider.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/app_input.dart';
import '../../../core/widgets/app_snackbar.dart';
import '../../../core/utils/validators.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _agreedToTerms = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreedToTerms) {
      AppSnackbar.show(context, message: 'Please accept the terms & conditions', type: SnackbarType.warning);
      return;
    }

    await ref.read(authProvider.notifier).register(
      email: _emailCtrl.text.trim(),
      username: _usernameCtrl.text.trim(),
      password: _passwordCtrl.text,
    );

    if (!mounted) return;
    final state = ref.read(authProvider);
    if (state.isAuthenticated) {
      context.go('/onboarding');
    } else if (state.errorMessage != null) {
      AppSnackbar.show(context, message: state.errorMessage!, type: SnackbarType.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppTheme.background, Color(0xFF0F1629)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),

                // ── Back button ────────────────────────────────
                IconButton(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.arrow_back_rounded, color: AppTheme.textPrimary),
                ),

                const SizedBox(height: 16),

                // ── Title ──────────────────────────────────────
                Text('Create Account', style: Theme.of(context).textTheme.displayLarge)
                    .animate().fadeIn(duration: 400.ms).slideY(begin: 0.2, end: 0),
                const SizedBox(height: 8),
                Text(
                  'Join thousands of learners exchanging skills',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: AppTheme.textSecondary),
                ).animate(delay: 200.ms).fadeIn(),

                const SizedBox(height: 32),

                // ── Form ───────────────────────────────────────
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      AppInput(
                        label: 'Email',
                        hintText: 'you@example.com',
                        controller: _emailCtrl,
                        validator: Validators.email,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        prefixIcon: const Icon(Icons.email_outlined, size: 20),
                      ).animate(delay: 300.ms).fadeIn().slideX(begin: -0.1, end: 0),

                      const SizedBox(height: 16),

                      AppInput(
                        label: 'Username',
                        hintText: 'Choose a username',
                        controller: _usernameCtrl,
                        validator: (v) => Validators.required(v, 'Username'),
                        textInputAction: TextInputAction.next,
                        prefixIcon: const Icon(Icons.person_outline_rounded, size: 20),
                      ).animate(delay: 400.ms).fadeIn().slideX(begin: -0.1, end: 0),

                      const SizedBox(height: 16),

                      AppInput(
                        label: 'Password',
                        hintText: 'Min 8 characters',
                        controller: _passwordCtrl,
                        obscureText: _obscurePassword,
                        validator: Validators.password,
                        textInputAction: TextInputAction.next,
                        prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            size: 20, color: AppTheme.textTertiary,
                          ),
                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        ),
                      ).animate(delay: 500.ms).fadeIn().slideX(begin: -0.1, end: 0),

                      const SizedBox(height: 16),

                      AppInput(
                        label: 'Confirm Password',
                        hintText: 'Re-enter password',
                        controller: _confirmCtrl,
                        obscureText: _obscureConfirm,
                        validator: (v) => Validators.confirmPassword(v, _passwordCtrl.text),
                        textInputAction: TextInputAction.done,
                        prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20),
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscureConfirm ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            size: 20, color: AppTheme.textTertiary,
                          ),
                          onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                        ),
                      ).animate(delay: 600.ms).fadeIn().slideX(begin: -0.1, end: 0),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // ── Terms checkbox ─────────────────────────────
                Row(
                  children: [
                    Checkbox(
                      value: _agreedToTerms,
                      onChanged: (v) => setState(() => _agreedToTerms = v ?? false),
                      activeColor: AppTheme.primary,
                      side: const BorderSide(color: AppTheme.textTertiary),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                    ),
                    Expanded(
                      child: Text.rich(
                        TextSpan(
                          text: 'I agree to the ',
                          style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                          children: [
                            TextSpan(
                              text: 'Terms & Conditions',
                              style: TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.w600),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ).animate(delay: 700.ms).fadeIn(),

                const SizedBox(height: 24),

                // ── Register button ────────────────────────────
                AppButton(
                  text: 'Create Account',
                  isGradient: true,
                  isLoading: authState.isLoading,
                  onPressed: _register,
                ).animate(delay: 800.ms).fadeIn().slideY(begin: 0.2, end: 0),

                const SizedBox(height: 24),

                // ── Login link ─────────────────────────────────
                Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Already have an account? ', style: TextStyle(color: AppTheme.textSecondary)),
                      GestureDetector(
                        onTap: () => context.pop(),
                        child: const Text(
                          'Sign In',
                          style: TextStyle(color: AppTheme.secondary, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ).animate(delay: 900.ms).fadeIn(),

                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
