package com.foodtrace.api.storage;

public interface StorageService {
  /** Stores the file and returns a publicly reachable URL for it. */
  String store(byte[] data, String filename, String contentType);
}
