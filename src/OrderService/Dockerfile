FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/Shared/Shared.Contracts/Shared.Contracts.csproj src/Shared/Shared.Contracts/
COPY src/OrderService/OrderService.Api/OrderService.Api.csproj src/OrderService/OrderService.Api/
RUN dotnet restore src/OrderService/OrderService.Api/OrderService.Api.csproj

COPY src/Shared/ src/Shared/
COPY src/OrderService/ src/OrderService/
RUN dotnet publish src/OrderService/OrderService.Api/OrderService.Api.csproj \
    -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "OrderService.Api.dll"]
