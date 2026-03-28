FROM golang:1.24-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build the application
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .

# Final minimal image
FROM alpine:latest

WORKDIR /app
COPY --from=builder /app/server .

# Expose port
EXPOSE 8080

# Command to run the executable
CMD ["./server"]
