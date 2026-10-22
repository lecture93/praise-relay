package com.dbinc.praise;

import java.io.File;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PraiseRelayApplication {

    public static void main(String[] args) {
        // SQLite는 폴더를 만들지 않으니 DB 파일이 들어갈 폴더를 먼저 만들어요.
        new File("data").mkdirs();
        SpringApplication.run(PraiseRelayApplication.class, args);
    }
}
