import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/api_constants.dart';
import '../services/storage_service.dart';
import 'api_exception.dart';

// ─── Dio singleton provider ─────────────────────────────────────
final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(storageServiceProvider);
  final dio = Dio(BaseOptions(
    baseUrl: ApiConstants.baseUrl,
    connectTimeout: ApiConstants.connectTimeout,
    receiveTimeout: ApiConstants.receiveTimeout,
    sendTimeout: ApiConstants.sendTimeout,
    headers: {'Content-Type': 'application/json'},
  ));

  // ── Auth interceptor (attach token + clear on 401) ───────────
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      debugPrint('[DIO_CLIENT] onRequest: ${options.path}');
      try {
        final token = await storage.getAccessToken();
        debugPrint('[DIO_CLIENT] token retrieved: ${token != null ? "length: ${token.length}" : "null"}');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
          debugPrint('[DIO_CLIENT] Attached Authorization Header');
        } else {
          debugPrint('[DIO_CLIENT] Warning: Token is null, NOT attaching Authorization Header');
        }
      } catch (e) {
        debugPrint('[DIO_CLIENT] Exception retrieving token: $e');
      }
      return handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        debugPrint('[DIO_CLIENT] Received 401 Unauthorized — clearing cached tokens');
        await storage.clearTokens();
      }
      return handler.next(error);
    },
  ));

  // ── Debug logging ────────────────────────────────────────────
  if (kDebugMode) {
    dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      logPrint: (msg) => debugPrint('[DIO] $msg'),
    ));
  }

  return dio;
});

// ─── High-level API helper ──────────────────────────────────────
final apiProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(dioProvider));
});

class ApiClient {
  final Dio _dio;
  const ApiClient(this._dio);

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      return response.data as T;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<T> post<T>(String path, {dynamic data}) async {
    try {
      final response = await _dio.post(path, data: data);
      return response.data as T;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<T> put<T>(String path, {dynamic data}) async {
    try {
      final response = await _dio.put(path, data: data);
      return response.data as T;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<T> delete<T>(String path, {dynamic data}) async {
    try {
      final response = await _dio.delete(path, data: data);
      return response.data as T;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<T> patch<T>(String path, {dynamic data}) async {
    try {
      final response = await _dio.patch(path, data: data);
      return response.data as T;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<T> uploadFile<T>(String path, FormData formData) async {
    try {
      final response = await _dio.post(
        path,
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      return response.data as T;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
