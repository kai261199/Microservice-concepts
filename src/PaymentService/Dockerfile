FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/Shared/Shared.Contracts/Shared.Contracts.csproj src/Shared/Shared.Contracts/
COPY src/PaymentService/PaymentService.Api/PaymentService.Api.csproj src/PaymentService/PaymentService.Api/
RUN dotnet restore src/PaymentService/PaymentService.Api/PaymentService.Api.csproj

COPY src/Shared/ src/Shared/
COPY src/PaymentService/ src/PaymentService/
RUN dotnet publish src/PaymentService/PaymentService.Api/PaymentService.Api.csproj \
    -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "PaymentService.Api.dll"]
