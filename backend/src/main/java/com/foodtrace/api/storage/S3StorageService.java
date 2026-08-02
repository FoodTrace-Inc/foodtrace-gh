package com.foodtrace.api.storage;

import java.util.UUID;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ObjectCannedACL;
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
    // Without an explicit ACL, S3's default Block Public Access setting (on
    // by default since 2023) makes the returned URL 403 for anyone who isn't
    // the bucket owner - the URL we hand back would be broken by default.
    // (Still requires the bucket to have ACLs enabled / not blocked at the
    // account level; this only helps buckets configured to allow it.)
    s3.putObject(
        PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType)
            .acl(ObjectCannedACL.PUBLIC_READ).build(),
        RequestBody.fromBytes(data));
    return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
  }
}
