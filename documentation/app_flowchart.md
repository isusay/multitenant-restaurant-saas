flowchart TD
  Start[Start] --> Auth[User Authentication]
  Auth -->|Success| RoleDecision{User Role}
  Auth -->|Fail| Auth
  RoleDecision -->|Owner| OwnerDash[Restaurant Owner Dashboard]
  RoleDecision -->|Staff| StaffDash[Staff Dashboard]
  RoleDecision -->|Super Admin| AdminDash[Super Admin Portal]
  OwnerDash --> MenuMgmt[Menu Management]
  OwnerDash --> StaffMgmt[Staff Management]
  OwnerDash --> Analytics[Sales Analytics]
  StaffDash --> OrderQueue[Kitchen Order Queue]
  StaffDash --> TableStatus[Table Status View]
  AdminDash --> TenantMgmt[Tenant Management]
  AdminDash --> Billing[Subscription Billing]
  Start --> QRFlow[QR Code Scan]
  QRFlow --> PublicMenu[Public Menu]
  PublicMenu --> PlaceOrder[Place Order]
  PlaceOrder --> OrderAPI[Order API Endpoint]
  OrderAPI --> OrderQueue