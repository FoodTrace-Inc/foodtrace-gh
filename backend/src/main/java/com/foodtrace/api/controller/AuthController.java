package com.foodtrace.api.controller;

import com.foodtrace.api.dto.ApiDtos;
import com.foodtrace.api.dto.ApiDtos.ForgotPasswordRequest;
import com.foodtrace.api.dto.ApiDtos.LoginRequest;
import com.foodtrace.api.dto.ApiDtos.OtpRequest;
import com.foodtrace.api.dto.ApiDtos.RegisterRequest;
import com.foodtrace.api.dto.ApiDtos.ResetPasswordRequest;
import com.foodtrace.api.dto.ApiDtos.VerifyOtpRequest;
import com.foodtrace.api.security.CurrentUser;
import com.foodtrace.api.service.AuthService;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @GetMapping("/roles")
  public Map<String, Object> roles() {
    return Map.of("roles", ApiDtos.USER_ROLES);
  }

  @PostMapping("/request-otp")
  public Map<String, Object> requestOtp(@RequestBody OtpRequest request) {
    return authService.requestOtp(request);
  }

  @PostMapping("/verify-otp")
  public Object verifyOtp(@RequestBody VerifyOtpRequest request) {
    return authService.verifyOtp(request);
  }

  @PostMapping("/register")
  public Object register(@RequestBody RegisterRequest request) {
    return authService.register(request);
  }

  @PostMapping("/login")
  public Object login(@RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @PostMapping("/forgot-password")
  public Map<String, Object> forgotPassword(@RequestBody ForgotPasswordRequest request) {
    return authService.forgotPassword(request);
  }

  @PostMapping("/reset-password")
  public Map<String, Object> resetPassword(@RequestBody ResetPasswordRequest request) {
    return authService.resetPassword(request);
  }

  @PostMapping("/security-question/lookup")
  public Map<String, Object> lookupSecurityQuestion(@RequestBody ApiDtos.SecurityQuestionLookupRequest request) {
    return authService.lookupSecurityQuestion(request);
  }

  @PostMapping("/reset-with-security")
  public Map<String, Object> resetWithSecurity(@RequestBody ApiDtos.SecurityResetRequest request) {
    return authService.resetPasswordWithSecurity(request);
  }

  @PutMapping("/security-question")
  public Map<String, Object> setSecurityQuestion(@RequestBody ApiDtos.SetSecurityQuestionRequest request, Authentication authentication) {
    CurrentUser user = (CurrentUser) authentication.getPrincipal();
    return authService.setSecurityQuestion(user.id(), request);
  }

  @GetMapping("/me")
  public Map<String, Object> me(Authentication authentication) {
    CurrentUser user = (CurrentUser) authentication.getPrincipal();
    return Map.of("user", authService.me(user.id()));
  }
}
