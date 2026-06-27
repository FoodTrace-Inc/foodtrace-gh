package gh.foodtrace.analytics.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

/**
 * Redis-backed cache for the analytics aggregates so the dashboard loads fast
 * and doesn't recompute on every page view. Values are stored as JSON (readable
 * with {@code redis-cli} and decoupled from Java serialization) and each cache
 * gets a TTL tuned to how often its underlying data really changes.
 *
 * <p>Guarded with {@code @Profile("!test")}: the build has no Redis server, so
 * the test profile falls back to an in-memory {@code simple} cache (see
 * {@code src/test/resources/application-test.yml}). Cache names here must match
 * the {@code @Cacheable} names in {@code AnalyticsService}.
 */
@Configuration
@Profile("!test")
public class RedisConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair
                        .fromSerializer(new GenericJackson2JsonRedisSerializer()));

        // Per-cache TTLs: fast-moving headline numbers expire sooner than the
        // historical monthly/region breakdowns.
        Map<String, RedisCacheConfiguration> perCache = Map.of(
                "summary",         defaults.entryTtl(Duration.ofSeconds(60)),
                "batchesByStatus", defaults.entryTtl(Duration.ofSeconds(120)),
                "recallsByMonth",  defaults.entryTtl(Duration.ofSeconds(300)),
                "farmsByRegion",   defaults.entryTtl(Duration.ofSeconds(300))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults.entryTtl(Duration.ofSeconds(120)))
                .withInitialCacheConfigurations(perCache)
                .build();
    }
}
