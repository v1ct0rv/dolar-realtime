# Infrastructure

Azure resources for dolar-realtime, managed with [Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/).

## Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- Logged in: `az login`

---

## collect-data-logic-app

Creates an Azure Logic App that calls `/api/cron/collect-data` every 5 minutes during Colombian market hours (Mon–Fri, 7:50 AM–1:30 PM COT).

**Resources created:**
- `Microsoft.Logic/workflows` → `dolar-v2-data-collector` in `dolar-rg`

**Parameters:**

| Parameter   | Description                                  | Default |
|-------------|----------------------------------------------|---------|
| `appUrl`    | Full URL of the collect-data endpoint        | `https://salmon-ground-0be8b030f.4.azurestaticapps.net/api/cron/collect-data` |
| `cronSecret`| Value of `CRON_SECRET` env var in the app    | _(required)_ |
| `location`  | Azure region                                 | resource group location |

### Deploy

```bash
az deployment group create \
  --subscription bac16e8f-4e6a-4c00-95ab-aa4ae882c319 \
  --resource-group dolar-rg \
  --template-file infra/collect-data-logic-app.bicep \
  --parameters @infra/collect-data-logic-app.parameters.json \
  --parameters cronSecret='<your-CRON_SECRET>'
```

> Pass `cronSecret` on the command line to avoid storing it in the parameters file.

### Update

Re-run the same command. Bicep deployments are idempotent — it will update the existing Logic App in place.

### Destroy

```bash
az resource delete \
  --subscription bac16e8f-4e6a-4c00-95ab-aa4ae882c319 \
  --resource-group dolar-rg \
  --resource-type Microsoft.Logic/workflows \
  --name dolar-v2-data-collector
```

### Verify deployment

```bash
az logic workflow show \
  --subscription bac16e8f-4e6a-4c00-95ab-aa4ae882c319 \
  --resource-group dolar-rg \
  --name dolar-v2-data-collector \
  --query "{state:state, createdTime:createdTime}" \
  --output table
```

### View recent runs

```bash
az logic workflow-run list \
  --subscription bac16e8f-4e6a-4c00-95ab-aa4ae882c319 \
  --resource-group dolar-rg \
  --workflow-name dolar-v2-data-collector \
  --query "[].{status:status, startTime:startTime}" \
  --output table
```
