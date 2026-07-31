package com.foodtrace.api.security;

import com.auth0.jwt.interfaces.DecodedJWT;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwtService;
  private final TokenRevocationService tokenRevocationService;

  public JwtAuthenticationFilter(JwtService jwtService, TokenRevocationService tokenRevocationService) {
    this.jwtService = jwtService;
    this.tokenRevocationService = tokenRevocationService;
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String header = request.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer ")) {
      try {
        String rawToken = header.substring("Bearer ".length());
        DecodedJWT jwt = jwtService.decode(rawToken);
        CurrentUser user = new CurrentUser(jwt.getSubject(), jwt.getClaim("role").asString(), jwt.getClaim("fullName").asString());
        if (!tokenRevocationService.isStillValid(user.id(), jwt.getIssuedAt().toInstant())
            || tokenRevocationService.isBlacklisted(rawToken)) {
          throw new RuntimeException("Token revoked");
        }
        var auth = new AbstractAuthenticationToken(List.of(new SimpleGrantedAuthority("ROLE_" + user.role().toUpperCase()))) {
          @Override
          public Object getCredentials() {
            return "";
          }

          @Override
          public Object getPrincipal() {
            return user;
          }
        };
        auth.setAuthenticated(true);
        SecurityContextHolder.getContext().setAuthentication(auth);
      } catch (RuntimeException ignored) {
        SecurityContextHolder.clearContext();
      }
    }
    filterChain.doFilter(request, response);
  }
}
