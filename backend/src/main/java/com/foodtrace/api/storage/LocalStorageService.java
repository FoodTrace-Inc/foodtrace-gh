package com.foodtrace.api.storage;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/** Default storage when no AWS bucket is configured — writes under uploads/evidence
 * and serves it back through the existing /uploads static mapping. No AWS creds needed. */
public class LocalStorageService implements StorageService {
  private final String uploadsDir;
  private final String publicApiUrl;

  public LocalStorageService(String uploadsDir, String publicApiUrl) {
    this.uploadsDir = uploadsDir != null ? uploadsDir : "uploads";
    this.publicApiUrl = publicApiUrl != null && !publicApiUrl.isBlank() ? publicApiUrl : "http://localhost:3000";
  }

  @Override
  public String store(byte[] data, String filename, String contentType) {
    try {
      Path dir = Paths.get(uploadsDir, "evidence");
      Files.createDirectories(dir);
      String safeName = UUID.randomUUID() + "-" + filename.replaceAll("[^A-Za-z0-9._-]", "_");
      Path file = dir.resolve(safeName);
      Files.write(file, data);
      return publicApiUrl + "/uploads/evidence/" + safeName;
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}
