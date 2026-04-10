# Microservice Concepts - Interactive Learning Platform

Demo project minh họa các khái niệm quan trọng trong Microservice Architecture thông qua quy trình đặt hàng (Order -> Reserve Stock -> Payment).

## Features

- **Interactive UI**: Visualize message flow giữa các services
- **Knowledge Base**: Deep dive vào 15 concepts/libraries/patterns
- **Live Demo**: Chạy thực tế với Docker + 3 services (.NET 8)
- **Simulation Mode**: Demo flow không cần backend
- **Senior Q&A**: 105 câu hỏi phỏng vấn senior level

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Lucide React (icons)
- React Syntax Highlighter (Dracula theme)

### Backend
- .NET 8
- PostgreSQL
- RabbitMQ
- MassTransit (Saga State Machine)
- Entity Framework Core

## Quick Start

### 1. Clone repository
```bash
git clone https://github.com/kvi1312/Microservice-concepts.git
cd Microservice-concepts
```

### 2. Start Infrastructure (Docker)
```bash
docker-compose up -d
```

### 3. Run Backend Services
```bash
# Terminal 1 - Order Service
cd src/OrderService/OrderService.Api
dotnet run

# Terminal 2 - Inventory Service  
cd src/InventoryService/InventoryService.Api
dotnet run

# Terminal 3 - Payment Service
cd src/PaymentService/PaymentService.Api
dotnet run
```

### 4. Run Frontend
```bash
cd ui
npm install
npm run dev
```

Open http://localhost:5173

## Project Structure

```
Microservice-concepts/
├── src/
│   ├── OrderService/          # Orchestrator + Saga State Machine
│   ├── InventoryService/      # Reserve/Release Stock
│   └── PaymentService/        # Process Payment
├── ui/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── data/             
│   │   │   ├── knowledgeTopics.ts    # 15 topics metadata
│   │   │   └── knowledgeContent.ts   # Deep dive content + Q&A
│   │   └── services/         # API calls + flow definitions
│   └── package.json
├── docker-compose.yml         # PostgreSQL + RabbitMQ
└── README.md
```

## Knowledge Base Topics

### Concepts (5)
- Orchestration
- Choreography  
- Event Sourcing
- Eventual Consistency
- Distributed Transaction (2PC)

### Libraries (5)
- EF Core
- MediatR
- AutoMapper
- RabbitMQ
- Redis

### Patterns (5)
- Saga Pattern
- CQRS
- Repository
- Outbox
- Inbox

Mỗi topic có:
- Bài toán thực tế
- Lý thuyết cốt lõi
- Code examples (Dracula syntax highlighting)
- .NET libraries recommendations
- 7 câu hỏi phỏng vấn senior level

## Scenarios

### Happy Path
Order -> Reserve Stock -> Process Payment -> Complete

### Payment Failure  
Order -> Reserve Stock -> Payment Fail -> **Compensate** (Release Stock) -> Failed

### Stock Failure
Order -> Stock Insufficient -> Failed (no compensation needed)

## Architecture Highlights

- **Orchestration Saga**: MassTransit State Machine
- **Message Bus**: RabbitMQ  
- **Outbox Pattern**: Transactional messaging
- **Inbox Pattern**: Idempotent consumers
- **Database per Service**: PostgreSQL instances
- **CQRS**: Separate read/write models
- **Event Sourcing**: Audit trail

## Learning Path

1. Chạy **Happy Path** scenario -> xem flow diagram
2. Click **Theory** tab -> xem concept relationship map
3. Click **hamburger menu** -> chọn topic -> deep dive
4. Đọc **Q&A** section -> senior interview questions
5. Thử **Payment Fail** -> xem compensating transactions
6. Check **Event Log** -> trace messages

## Development

### Backend
```bash
# Add migration
cd src/OrderService/OrderService.Api
dotnet ef migrations add MigrationName

# Update database
dotnet ef database update
```

### Frontend  
```bash
cd ui
npm run build    # Production build
npm run dev      # Development server
```

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

## License

MIT

## Author

**kvi1312**  
GitHub: [@kvi1312](https://github.com/kvi1312)
