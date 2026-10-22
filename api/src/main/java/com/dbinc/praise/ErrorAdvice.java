package com.dbinc.praise;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

// 실패는 모두 {"error": "설명"} 모양으로 답해요.
@RestControllerAdvice
public class ErrorAdvice {

    @ExceptionHandler(BadEntryException.class)
    ResponseEntity<Map<String, String>> badEntry(BadEntryException error) {
        return error(HttpStatus.BAD_REQUEST, error.getMessage());
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<Map<String, String>> unreadable() {
        return error(HttpStatus.BAD_REQUEST, "JSON 형식을 확인해 주세요.");
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<Map<String, String>> mediaType() {
        return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "application/json으로 보내 주세요.");
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    ResponseEntity<Map<String, String>> notFound() {
        return error(HttpStatus.NOT_FOUND, "찾을 수 없는 경로입니다.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    ResponseEntity<Map<String, String>> method() {
        return error(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방법입니다.");
    }

    static ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("error", message));
    }
}
