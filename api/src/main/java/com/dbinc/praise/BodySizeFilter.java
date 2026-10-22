package com.dbinc.praise;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// 8KiB(8,192바이트)가 넘는 본문은 읽기 전에 413으로 막아요.
@Component
public class BodySizeFilter extends OncePerRequestFilter {

    static final long MAX_BODY = 8192;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request.getContentLengthLong() > MAX_BODY) {
            response.setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"error\": \"요청 본문이 너무 큽니다.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
