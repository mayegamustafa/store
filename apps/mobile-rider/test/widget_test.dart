// Smoke test: the app widget can be constructed.
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_rider/main.dart';

void main() {
  test('App widget constructs', () {
    expect(const TotalStoreRiderApp(), isA<TotalStoreRiderApp>());
  });
}
