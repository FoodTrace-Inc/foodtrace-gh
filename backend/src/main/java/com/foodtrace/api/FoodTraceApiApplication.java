package com.foodtrace.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class FoodTraceApiApplication {
  public static void main(String[] args) {
    String dbUrl = System.getenv("DATABASE_URL");
    if (dbUrl != null && dbUrl.startsWith("postgresql://")) {
      System.setProperty("DATABASE_URL", "jdbc:" + dbUrl);
    } else if (dbUrl != null && dbUrl.startsWith("postgres://")) {
      System.setProperty("DATABASE_URL", "jdbc:postgresql" + dbUrl.substring("postgres".length()));
    }
    SpringApplication.run(FoodTraceApiApplication.class, args);
  }
}
