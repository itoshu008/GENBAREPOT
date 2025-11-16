#!/bin/bash
# APIエンドポイントのHTTPステータスコード確認スクリプト
# 他のアプリに干渉しないよう、ポート4100のみをテスト

BASE_URL="http://localhost:4100"
echo "=== APIエンドポイント HTTPステータスコード確認 ==="
echo "ベースURL: $BASE_URL"
echo ""

# カラー出力用
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local method=$1
    local path=$2
    local data=$3
    local expected=$4
    
    if [ "$method" = "GET" ]; then
        status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
    else
        status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE_URL$path" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    if [ "$status" = "$expected" ]; then
        echo -e "${GREEN}✓${NC} $method $path -> $status (期待値: $expected)"
    else
        echo -e "${RED}✗${NC} $method $path -> $status (期待値: $expected)"
    fi
}

echo "【GET エンドポイント】"
test_endpoint "GET" "/" "200"
test_endpoint "GET" "/staff" "200"
test_endpoint "GET" "/chief" "200"
test_endpoint "GET" "/sales" "200"
test_endpoint "GET" "/accounting" "200"
test_endpoint "GET" "/admin/reports" "200"
test_endpoint "GET" "/admin/master" "200"

echo ""
echo "【API GET エンドポイント】"
test_endpoint "GET" "/api/reports" "200"
test_endpoint "GET" "/api/reports?role=staff" "200"
test_endpoint "GET" "/api/reports/999" "404"
test_endpoint "GET" "/api/sheets" "200"
test_endpoint "GET" "/api/masters/sites" "200"
test_endpoint "GET" "/api/masters/staffs" "200"
test_endpoint "GET" "/api/master/sheet-settings" "200"
test_endpoint "GET" "/api/master/sites?year=2024&month=11" "200"

echo ""
echo "【API POST エンドポイント（バリデーションエラー期待）】"
test_endpoint "POST" "/api/reports" '{}' "400"
test_endpoint "POST" "/api/sheets" '{}' "400"
test_endpoint "POST" "/api/reports/1/status" '{}' "400"

echo ""
echo "【存在しないエンドポイント】"
test_endpoint "GET" "/api/nonexistent" "" "404"
test_endpoint "GET" "/nonexistent" "200"  # SPAフォールバックで200になる

echo ""
echo "=== テスト完了 ==="

