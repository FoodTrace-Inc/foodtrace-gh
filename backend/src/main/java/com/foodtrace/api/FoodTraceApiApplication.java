package com.foodtrace.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FoodTraceApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(FoodTraceApiApplication.class, args);
  }
}
