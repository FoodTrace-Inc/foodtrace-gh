package com.foodtrace.api.config;

import com.foodtrace.api.storage.LocalStorageService;
import com.foodtrace.api.storage.S3StorageService;
import com.foodtrace.api.storage.StorageService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class StorageConfig {
  @Bean
  StorageService storageService(AppProperties properties) {
    String bucket = properties.awsBucketName();
    String accessKeyId = properties.awsAccessKeyId();
    // Both a bucket AND a key are required — a bucket name alone (e.g. left over from
    // .env.example) with no credentials would otherwise pick S3 and then fail every upload.
    if (bucket != null && !bucket.isBlank() && accessKeyId != null && !accessKeyId.isBlank()) {
      String region = properties.awsRegion() != null && !properties.awsRegion().isBlank()
          ? properties.awsRegion() : "eu-west-1";
      S3Client s3 = S3Client.builder()
          .region(Region.of(region))
          .credentialsProvider(StaticCredentialsProvider.create(
              AwsBasicCredentials.create(accessKeyId, properties.awsSecretAccessKey())))
          .build();
      return new S3StorageService(s3, bucket, region);
    }
    return new LocalStorageService(properties.uploadsDir(), properties.publicApiUrl());
  }
}
