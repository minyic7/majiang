FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY src/Majiang.Server/Majiang.Server.csproj src/Majiang.Server/
RUN dotnet restore src/Majiang.Server/Majiang.Server.csproj

COPY src/Majiang.Server/ src/Majiang.Server/
RUN dotnet publish src/Majiang.Server/Majiang.Server.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:7702
EXPOSE 7702

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Majiang.Server.dll"]

