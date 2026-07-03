// Smoke test: the app widget can be constructed.
import 'package:flutter_test/flutter_test.dart';

import 'package:total_store_buyer/main.dart';

void main() {
  test('App widget constructs', () {
    expect(const TotalStoreApp(), isA<TotalStoreApp>());
  });
}
