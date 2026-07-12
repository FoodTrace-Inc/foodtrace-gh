package com.foodtrace.api.sms;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Default SMS sender when no Africa's Talking API key is configured. Logs the
 * message and records it in an in-memory outbox so dev/test/demo need no
 * SMS credentials or network access.
 */
public class LocalSmsSender implements SmsSender {
  private static final Logger log = LoggerFactory.getLogger(LocalSmsSender.class);
  private final List<String[]> outbox = Collections.synchronizedList(new ArrayList<>());

  @Override
  public void send(String phoneNumber, String message) {
    log.info("[sms:local] to={} message={}", phoneNumber, message);
    outbox.add(new String[] {phoneNumber, message});
  }

  public List<String[]> outbox() {
    return List.copyOf(outbox);
  }
}
