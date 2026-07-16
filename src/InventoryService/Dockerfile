FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/Shared/Shared.Contracts/Shared.Contracts.csproj src/Shared/Shared.Contracts/
COPY src/InventoryService/InventoryService.Api/InventoryService.Api.csproj src/InventoryService/InventoryService.Api/
RUN dotnet restore src/InventoryService/InventoryService.Api/InventoryService.Api.csproj

COPY src/Shared/ src/Shared/
COPY src/InventoryService/ src/InventoryService/
RUN dotnet publish src/InventoryService/InventoryService.Api/InventoryService.Api.csproj \
    -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "InventoryService.Api.dll"]
