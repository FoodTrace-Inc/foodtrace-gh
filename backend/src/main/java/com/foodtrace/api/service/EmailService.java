package com.foodtrace.api.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
  private static final Logger log = LoggerFactory.getLogger(EmailService.class);

  private final JavaMailSender mailSender;
  private final String fromAddress;
  private final boolean configured;

  public EmailService(JavaMailSender mailSender, @Value("${SMTP_USERNAME:}") String smtpUsername) {
    this.mailSender = mailSender;
    this.fromAddress = smtpUsername;
    this.configured = smtpUsername != null && !smtpUsername.isBlank();
  }

  /** Returns true if it actually sent an email; false if SMTP isn't configured yet. */
  public boolean sendPasswordResetCode(String toEmail, String code) {
    if (!configured) {
      log.warn("SMTP_USERNAME/SMTP_PASSWORD not set — password reset code for {} was generated but not emailed.", toEmail);
      return false;
    }
    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(fromAddress);
    message.setTo(toEmail);
    message.setSubject("Your FoodTrace GH password reset code");
    message.setText("""
        Your password reset code is: %s

        This code expires in 15 minutes. If you didn't request this, you can ignore this email.

        — FoodTrace GH
        """.formatted(code));
    try {
      mailSender.send(message);
      return true;
    } catch (MailException error) {
      log.error("Failed to send password reset email to {}: {}", toEmail, error.getMessage());
      return false;
    }
  }
}
