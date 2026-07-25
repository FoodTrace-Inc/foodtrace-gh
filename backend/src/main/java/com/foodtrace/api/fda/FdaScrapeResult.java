package com.foodtrace.api.fda;

import java.util.List;

/** Outcome of a full registry pull: what we got, how much the registry says exists, and what failed. */
public record FdaScrapeResult(List<FdaProduct> products, int recordsTotal, List<String> pageErrors) {
}
