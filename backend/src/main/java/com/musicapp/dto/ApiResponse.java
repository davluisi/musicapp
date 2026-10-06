package com.musicapp.dto;

public class ApiResponse<T> {
    private T data;
    private String message;
    private String status;

    public ApiResponse() {
    }

    public ApiResponse(T data, String message, String status) {
        this.data = data;
        this.message = message;
        this.status = status;
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(data, message, "success");
    }

    public static <T> ApiResponse<T> error(String message) {
        return new ApiResponse<>(null, message, "error");
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
