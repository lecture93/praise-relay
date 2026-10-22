package com.dbinc.praise;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

@RestController
@RequestMapping("/api/entries")
public class EntryController {

    private final JdbcTemplate db;

    public EntryController(JdbcTemplate db) {
        this.db = db;
    }

    @Operation(summary = "칭찬 목록", description = "최신 글부터 최대 200개를 돌려줘요.")
    @GetMapping
    public Map<String, Object> list() {
        List<Map<String, Object>> entries = db.queryForList(
                "SELECT id, name, message, created_at FROM entries ORDER BY id DESC LIMIT 200");
        return Map.of("entries", entries);
    }

    @Operation(summary = "칭찬 남기기", description = "name(보내는 사람)과 message(칭찬 한마디)를 저장해요.",
            responses = {
                    @ApiResponse(responseCode = "201", description = "저장됨"),
                    @ApiResponse(responseCode = "400", description = "값이 잘못됐거나 JSON이 깨짐"),
                    @ApiResponse(responseCode = "413", description = "본문이 8KiB를 넘음"),
                    @ApiResponse(responseCode = "415", description = "JSON이 아닌 형식")})
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
            content = @Content(schema = @Schema(implementation = EntryRequest.class)))
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> create(@RequestBody JsonNode body) {
        if (!body.isObject()) {
            throw new BadEntryException("JSON 객체를 보내 주세요.");
        }
        String name = field(body, "name", "이름", 40);
        String message = field(body, "message", "내용", 500);
        String createdAt = Instant.now().truncatedTo(ChronoUnit.SECONDS).toString();
        Long id = db.queryForObject(
                "INSERT INTO entries(name, message, created_at) VALUES (?, ?, ?) RETURNING id",
                Long.class, name, message, createdAt);

        Map<String, Object> entry = new LinkedHashMap<>();
        entry.put("id", id);
        entry.put("name", name);
        entry.put("message", message);
        entry.put("created_at", createdAt);
        return Map.of("entry", entry);
    }

    // 문자열인지 보고, 앞뒤 공백을 지운 뒤 1~maximum자인지 검사해요.
    private static String field(JsonNode body, String key, String label, int maximum) {
        JsonNode raw = body.get(key);
        if (raw == null || !raw.isTextual() || raw.asText().strip().isEmpty()) {
            throw new BadEntryException(label + "을 입력해 주세요.");
        }
        String value = raw.asText().strip();
        if (value.codePointCount(0, value.length()) > maximum) {
            throw new BadEntryException(label + "은 " + maximum + "자 이내로 입력해 주세요.");
        }
        return value;
    }

    @Schema(name = "EntryRequest")
    static class EntryRequest {
        @Schema(description = "보내는 사람, 1~40자", example = "김동료")
        public String name;
        @Schema(description = "칭찬 한마디, 1~500자", example = "회의 자료 정리해 줘서 고마워요!")
        public String message;
    }
}
