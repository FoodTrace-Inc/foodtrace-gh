package com.foodtrace.api.storage;

import java.util.UUID;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/** Real S3 upload, used only when AWS_BUCKET_NAME is configured. */
public class S3StorageService implements StorageService {
  private final S3Client s3;
  private final String bucket;
  private final String region;

  public S3StorageService(S3Client s3, String bucket, String region) {
    this.s3 = s3;
    this.bucket = bucket;
    this.region = region;
  }

  @Override
  public String store(byte[] data, String filename, String contentType) {
    String key = "evidence/" + UUID.randomUUID() + "-" + filename.replaceAll("[^A-Za-z0-9._-]", "_");
    s3.putObject(
        PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
        RequestBody.fromBytes(data));
    return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
  }
}
