# Use SDK for build & watch
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /app

# Copy csproj and restore as a separate step for caching
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . ./

# Install dotnet-watch and ef tools globally
RUN dotnet tool install --global dotnet-ef \
    && dotnet tool install --global dotnet-watch

# Add tools path to system path
ENV PATH="$PATH:/root/.dotnet/tools"

# Expose port
EXPOSE 5002

# Run migration and then start app with hot reload
ENTRYPOINT ["sh", "-c", "dotnet ef database update && dotnet watch run --urls http://0.0.0.0:5002"]
