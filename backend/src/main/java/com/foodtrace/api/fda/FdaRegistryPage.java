package com.foodtrace.api.fda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** One page of the DataTables server-side response from the FDA public registry. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FdaRegistryPage(
    int draw,
    @JsonProperty("recordsTotal") int recordsTotal,
    @JsonProperty("recordsFiltered") int recordsFiltered,
    List<FdaProduct> data
) {
}
