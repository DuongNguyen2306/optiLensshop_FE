param(
  [string]$ApiBaseUrl = "http://localhost:3000",
  [string]$CustomerEmail = "",
  [string]$CustomerPassword = "",
  [string]$StaffEmail = "",
  [string]$StaffPassword = "",
  [string]$PreorderVariantId = "",
  [string]$InventoryVariantId = ""
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$message) {
  Write-Host ""
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Resolve-Token($loginResponse) {
  if ($null -eq $loginResponse) { return "" }
  if ($loginResponse.access_token) { return [string]$loginResponse.access_token }
  if ($loginResponse.token) { return [string]$loginResponse.token }
  if ($loginResponse.data -and $loginResponse.data.access_token) { return [string]$loginResponse.data.access_token }
  return ""
}

function Resolve-OrderId($responseObject) {
  if ($null -eq $responseObject) { return "" }
  if ($responseObject.orderId) { return [string]$responseObject.orderId }
  if ($responseObject.order_id) { return [string]$responseObject.order_id }
  if ($responseObject.data -and $responseObject.data.orderId) { return [string]$responseObject.data.orderId }
  if ($responseObject.data -and $responseObject.data.order_id) { return [string]$responseObject.data.order_id }
  if ($responseObject.order -and $responseObject.order._id) { return [string]$responseObject.order._id }
  return ""
}

function Invoke-Api(
  [string]$Method,
  [string]$Path,
  [hashtable]$Headers = @{},
  [object]$Body = $null
) {
  $uri = "$ApiBaseUrl$Path"
  $args = @{
    Method = $Method
    Uri = $uri
    Headers = $Headers
  }
  if ($null -ne $Body) {
    $args["Body"] = ($Body | ConvertTo-Json -Depth 10)
    $args["ContentType"] = "application/json"
  }
  return Invoke-RestMethod @args
}

function Assert-HasToken([string]$token, [string]$label) {
  if ([string]::IsNullOrWhiteSpace($token)) {
    throw "Dang nhap $label that bai: khong lay duoc token."
  }
}

Write-Host "OptiLens API smoke test for NEW features" -ForegroundColor Green
Write-Host "API: $ApiBaseUrl"

if ([string]::IsNullOrWhiteSpace($CustomerEmail) -or [string]::IsNullOrWhiteSpace($CustomerPassword)) {
  throw "Vui long truyen CustomerEmail va CustomerPassword."
}

Write-Step "1) Dang nhap customer"
$customerLogin = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
  email = $CustomerEmail
  password = $CustomerPassword
}
$customerToken = Resolve-Token $customerLogin
Assert-HasToken -token $customerToken -label "customer"
$customerHeaders = @{ Authorization = "Bearer $customerToken" }
Write-Host "OK: Login customer"

Write-Step "2) Profile APIs (GET/PUT /users/me/profile)"
$profileBefore = Invoke-Api -Method "GET" -Path "/users/me/profile" -Headers $customerHeaders
Write-Host "GET /users/me/profile OK"

$timestamp = Get-Date -Format "HHmmss"
$profileUpdate = Invoke-Api -Method "PUT" -Path "/users/me/profile" -Headers $customerHeaders -Body @{
  first_name = "Test"
  last_name = "FE$timestamp"
  gender = "other"
}
Write-Host "PUT /users/me/profile OK"

Write-Step "3) Address APIs (GET/POST /users/me/addresses)"
$addressesBefore = Invoke-Api -Method "GET" -Path "/users/me/addresses" -Headers $customerHeaders
Write-Host "GET /users/me/addresses OK"

$newAddress = Invoke-Api -Method "POST" -Path "/users/me/addresses" -Headers $customerHeaders -Body @{
  label = "Script Test"
  receiver_name = "QA Script"
  receiver_phone = "0900000000"
  province = "Ha Noi"
  district = "Quan Ba Dinh"
  ward = "Phuc Xa"
  address_line = "123 Test Street"
  is_default = $false
}
Write-Host "POST /users/me/addresses OK"

Write-Step "4) Preorder-now (POST /orders/preorder-now)"
if ([string]::IsNullOrWhiteSpace($PreorderVariantId)) {
  Write-Host "SKIP: Chua truyen PreorderVariantId." -ForegroundColor Yellow
} else {
  $preorderRes = Invoke-Api -Method "POST" -Path "/orders/preorder-now" -Headers $customerHeaders -Body @{
    shipping_address = "123 Test Street, Phuc Xa, Ba Dinh, Ha Noi"
    shipping_method = "pickup"
    payment_method = "cod"
    items = @(
      @{
        variant_id = $PreorderVariantId
        quantity = 1
        lens_params = @{}
      }
    )
  }
  $preorderOrderId = Resolve-OrderId $preorderRes
  Write-Host "POST /orders/preorder-now OK. OrderId: $preorderOrderId"
}

Write-Step "5) VNPay create (checkout + POST /vnpay/create)"
$checkoutRes = Invoke-Api -Method "POST" -Path "/orders/checkout" -Headers $customerHeaders -Body @{
  shipping_address = "123 Test Street, Phuc Xa, Ba Dinh, Ha Noi"
  shipping_method = "ship"
  payment_method = "vnpay"
}
$checkoutOrderId = Resolve-OrderId $checkoutRes
if ([string]::IsNullOrWhiteSpace($checkoutOrderId)) {
  Write-Host "WARN: Checkout khong tra orderId, bo qua buoc /vnpay/create." -ForegroundColor Yellow
} else {
  $vnpayRes = Invoke-Api -Method "POST" -Path "/vnpay/create" -Headers $customerHeaders -Body @{
    orderId = $checkoutOrderId
  }
  Write-Host "POST /vnpay/create OK. OrderId: $checkoutOrderId"
  if ($vnpayRes.payUrl) {
    Write-Host "VNPay URL: $($vnpayRes.payUrl)"
  }
}

Write-Step "6) Inventory APIs (manager/admin)"
if (
  [string]::IsNullOrWhiteSpace($StaffEmail) -or
  [string]::IsNullOrWhiteSpace($StaffPassword) -or
  [string]::IsNullOrWhiteSpace($InventoryVariantId)
) {
  Write-Host "SKIP: Inventory can StaffEmail/StaffPassword/InventoryVariantId." -ForegroundColor Yellow
} else {
  $staffLogin = Invoke-Api -Method "POST" -Path "/auth/login" -Body @{
    email = $StaffEmail
    password = $StaffPassword
  }
  $staffToken = Resolve-Token $staffLogin
  Assert-HasToken -token $staffToken -label "staff"
  $staffHeaders = @{ Authorization = "Bearer $staffToken" }

  $receipts = Invoke-Api -Method "GET" -Path "/inventory/receipts" -Headers $staffHeaders
  Write-Host "GET /inventory/receipts OK"

  $receiptCreate = Invoke-Api -Method "POST" -Path "/inventory/receipts" -Headers $staffHeaders -Body @{
    variant_id = $InventoryVariantId
    qty_in = 5
    unit_cost = 100000
    supplier_name = "Script Supplier"
    note = "Auto test receipt"
  }
  Write-Host "POST /inventory/receipts OK"

  $receiptId = ""
  if ($receiptCreate.id) { $receiptId = [string]$receiptCreate.id }
  elseif ($receiptCreate._id) { $receiptId = [string]$receiptCreate._id }
  elseif ($receiptCreate.receipt -and $receiptCreate.receipt._id) { $receiptId = [string]$receiptCreate.receipt._id }

  if (-not [string]::IsNullOrWhiteSpace($receiptId)) {
    $receiptConfirm = Invoke-Api -Method "PATCH" -Path "/inventory/receipts/$receiptId/confirm" -Headers $staffHeaders
    Write-Host "PATCH /inventory/receipts/:id/confirm OK ($receiptId)"
  } else {
    Write-Host "WARN: Khong lay duoc receiptId de confirm." -ForegroundColor Yellow
  }

  $ledger = Invoke-Api -Method "GET" -Path "/inventory/ledger?limit=20" -Headers $staffHeaders
  Write-Host "GET /inventory/ledger OK"
}

Write-Host ""
Write-Host "ALL DONE - Script hoan tat." -ForegroundColor Green
