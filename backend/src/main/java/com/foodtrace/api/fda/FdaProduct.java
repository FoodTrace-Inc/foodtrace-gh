package com.foodtrace.api.fda;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * One row from the Ghana FDA public products registry
 * (https://verifypermit.fdaghana.gov.gh/publicsearch). Field names mirror the
 * registry's own JSON keys so Jackson can bind directly with no manual mapping.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record FdaProduct(
    @JsonProperty("product_uuid") String productUuid,
    @JsonProperty("product_id") String productId,
    @JsonProperty("registration_number") String registrationNumber,
    @JsonProperty("product_name") String productName,
    @JsonProperty("generic_name") String genericName,
    @JsonProperty("product_category") String productCategory,
    @JsonProperty("product_sub_category") String productSubCategory,
    @JsonProperty("manufacturer") String manufacturer,
    @JsonProperty("representative_company_local_agent_applicant") String representativeCompany,
    @JsonProperty("registration_date") String registrationDate,
    @JsonProperty("expiry_date") String expiryDate,
    @JsonProperty("registration_type") String registrationType,
    @JsonProperty("status") String status,
    @JsonProperty("country_origin") String countryOrigin,
    @JsonProperty("region") String region
) {
}
