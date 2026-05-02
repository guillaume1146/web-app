---
description: Add a new platform service for a provider type
user-invocable: true
---

# Add Platform Service

Create a new service in the platform catalog.

## Steps

1. **Define service** in `PlatformService`:
   - `providerType`: DOCTOR, NURSE, DENTIST, etc.
   - `serviceName`: e.g., "Teeth Whitening"
   - `category`: e.g., "Cosmetic"
   - `description`: what the service does
   - `defaultPrice`: base price in local currency
   - `duration`: minutes
   - `isDefault`: true = auto-assigned to new providers of this type

2. **Create via API** (as regional admin):
   ```
   POST /api/services/custom
   {
     "providerType": "DENTIST",
     "serviceName": "Teeth Whitening",
     "category": "Cosmetic",
     "description": "Professional teeth whitening treatment",
     "defaultPrice": 3000,
     "duration": 60
   }
   ```

3. **Or create via seed file** if it's a system default service

4. **Optionally link to workflow template**:
   - Find or create a `WorkflowTemplate` with matching `providerType` + `serviceMode`
   - Set `platformServiceId` on the template

5. **Verify**: `GET /api/services/catalog?providerType=DENTIST` should show the new service
