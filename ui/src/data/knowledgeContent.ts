export interface CodeExample {
  title: string;
  language: string;
  code: string;
}

export interface QA {
  question: string;
  answer: string;
}

export interface TopicContent {
  id: string;
  problem: string;
  theory: string[];
  codeExamples: CodeExample[];
  libraries: { name: string; nuget: string; desc: string }[];
  qa: QA[];
}

export const KNOWLEDGE_CONTENT: TopicContent[] = [
  // ORCHESTRATION
  {
    id: 'orchestration',
    problem: 'Khi đặt hàng, cần gọi lần lượt: InventoryService (reserve stock) -> PaymentService (charge) -> ShippingService (create shipment). Nếu không có ai điều phối, mỗi service tự gọi nhau tạo thành "spaghetti" dependencies, không biết flow đang ở đâu, retry thế nào khi fail.',
    theory: [
      'Orchestrator (Saga Coordinator) nắm giữ toàn bộ business flow - nó biết step nào tiếp, step nào cần compensate.',
      'Gửi COMMAND (point-to-point) đến đúng service đích qua message queue, khác với EVENT (fan-out).',
      'State machine lưu trạng thái hiện tại vào persistent store (DB/Redis) -> crash & restart không mất flow.',
      'Dễ debug, trace, audit: tất cả logic flow tập trung 1 nơi, nhìn state machine là hiểu được flow.',
      'Trade-off: Single point of knowledge (không phải failure - vì stateless + durable). Orchestrator phải maintain khi flow thay đổi.',
      'Phù hợp flow phức tạp (>=3 service), cần visibility cao, cần compensating logic rõ ràng.',
    ],
    codeExamples: [
      {
        title: 'MassTransit Saga State Machine',
        language: 'csharp',
        code: `public class OrderSagaState : SagaStateMachineInstance
{
    public Guid CorrelationId { get; set; }
    public string CurrentState { get; set; }
    public Guid OrderId { get; set; }
}

public class OrderSagaStateMachine : MassTransitStateMachine<OrderSagaState>
{
    public State StockReserving { get; private set; }
    public State PaymentProcessing { get; private set; }
    
    public Event<OrderCreatedEvent> OrderCreated { get; private set; }
    public Event<StockReservedEvent> StockReserved { get; private set; }
    
    public OrderSagaStateMachine()
    {
        Initially(
            When(OrderCreated)
                .Send(new Uri("queue:reserve-stock"),
                    ctx => new ReserveStockCommand(ctx.Saga.OrderId))
                .TransitionTo(StockReserving)
        );
        
        During(StockReserving,
            When(StockReserved)
                .Send(new Uri("queue:process-payment"),
                    ctx => new ProcessPaymentCommand(ctx.Saga.OrderId))
                .TransitionTo(PaymentProcessing)
        );
    }
}`,
      },
    ],
    libraries: [
      { name: 'MassTransit', nuget: 'MassTransit', desc: 'Framework message bus + Saga State Machine' },
      { name: 'NServiceBus', nuget: 'NServiceBus', desc: 'Enterprise-grade service bus' },
    ],
    qa: [
      {
        question: 'Orchestration khác Choreography như thế nào? Khi nào dùng cái nào?',
        answer: 'Orchestration: có central coordinator điều khiển flow (command-driven), dễ trace/debug, phù hợp flow phức tạp (>=3 services). Choreography: mỗi service tự react với events (event-driven), loose coupling cao, phù hợp flow đơn giản. Best practice: Orchestration cho core business flow, Choreography cho side-effects (notification, analytics).'
      },
      {
        question: 'Orchestrator có phải là single point of failure không? Làm sao đảm bảo reliability?',
        answer: 'KHÔNG phải SPOF nếu design đúng: (1) Saga state lưu persistent (DB/Redis) -> crash thì recreate instance khác đọc state tiếp tục. (2) Orchestrator stateless - chỉ là state machine runner. (3) Message broker durable -> messages không mất. (4) Deploy nhiều instances + load balancer. Single point of KNOWLEDGE (tập trung logic) != single point of FAILURE.'
      },
      {
        question: 'Làm sao handle timeout trong orchestrated saga? VD: PaymentService không response sau 30s?',
        answer: 'Dùng Schedule/RequestTimeout: (1) Khi gửi command, schedule timeout event (30s). (2) Nếu response về trước -> cancel timeout. (3) Nếu timeout fire trước -> trigger compensating. MassTransit: .Request() có built-in timeout. NServiceBus: dùng Saga timeout. Cần idempotency ở consumer để handle trường hợp response đến SAU khi timeout fired.'
      },
      {
        question: 'Saga state lớn (nhiều properties) có ảnh hưởng performance không? Best practice?',
        answer: 'CÓ ảnh hưởng: (1) Load/save state từ DB mỗi message -> I/O overhead. (2) Serialize/deserialize cost. Best practices: (1) Chỉ lưu minimal state cần thiết (ID, status, correlation data). (2) Không lưu entire domain object. (3) Dùng snapshot pattern nếu state phức tạp. (4) Cân nhắc separate read model cho query. (5) Optimistic concurrency thay vì pessimistic để giảm lock.'
      },
      {
        question: 'Có thể kết hợp Orchestration + Choreography trong cùng 1 workflow không?',
        answer: 'ĐƯỢC và đây là pattern phổ biến: Orchestration cho critical path (order -> stock -> payment) đảm bảo consistency. Choreography cho side-effects: saga publish OrderCompletedEvent -> NotificationService, AnalyticsService, LoyaltyService tự subscribe. Lợi ích: Core flow có control + visibility, side-effects loose coupling + extensible.'
      },
      {
        question: 'Nếu Orchestrator gửi command nhưng consumer đang deploy/restart thì sao? Message có mất không?',
        answer: 'Message KHÔNG mất nếu dùng durable queue: (1) RabbitMQ queue durable + persistent message -> survive broker restart. (2) Message nằm trong queue chờ consumer online. (3) Consumer restart -> auto-reconnect và consume tiếp. (4) ACK mechanism: chỉ remove message khi consumer ACK. Best practice: set TTL hợp lý (VD: 1 giờ) để tránh message cũ tồn đọng vô hạn.'
      },
      {
        question: 'Làm sao version/migrate saga khi business logic thay đổi? VD: thêm step mới vào giữa flow?',
        answer: 'Chiến lược migration: (1) Versioned saga: OrderSagaV2 chạy song song với V1, route message theo version field. (2) Feature toggle: thêm conditional state transition. (3) Drain-and-deploy: đợi tất cả in-flight saga complete trước khi deploy. (4) State transformation: migration script transform old state -> new format. (5) Backward compatible: thêm step ở cuối thay vì giữa. Best: versioned saga cho breaking changes.'
      },
    ],
  },

  // CHOREOGRAPHY
  {
    id: 'choreography',
    problem: 'OrderService tạo đơn xong, nhiều service cần phản ứng: InventoryService reserve stock, NotificationService gửi email, AnalyticsService log. Nếu OrderService phải biết & gọi từng service -> coupling chặt.',
    theory: [
      'Mỗi service publish EVENT lên message bus -> không cần biết ai subscribe.',
      'Service nào quan tâm thì tự subscribe và xử lý - loose coupling tối đa.',
      'Phù hợp flow đơn giản, notification fan-out, analytics.',
      'Flow phức tạp -> khó trace, không có nơi nào nhìn thấy toàn bộ flow.',
      'Compensating logic phân tán ở từng consumer.',
    ],
    codeExamples: [
      {
        title: 'Publisher & Subscribers',
        language: 'csharp',
        code: `// Publisher
public async Task CreateOrder(CreateOrderRequest req)
{
    var order = new Order(req.CustomerId, req.Items);
    await _db.SaveChangesAsync();
    
    await _bus.Publish(new OrderCreatedEvent
    {
        OrderId = order.Id,
        Items = order.Items
    });
}

// Subscriber 1
public class InventoryConsumer : IConsumer<OrderCreatedEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedEvent> ctx)
    {
        foreach (var item in ctx.Message.Items)
            await ReserveStock(item.ProductId, item.Quantity);
    }
}

// Subscriber 2
public class NotificationConsumer : IConsumer<OrderCreatedEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedEvent> ctx)
    {
        await SendOrderConfirmationEmail(ctx.Message.OrderId);
    }
}`,
      },
    ],
    libraries: [
      { name: 'MassTransit', nuget: 'MassTransit', desc: 'Publish/subscribe framework' },
      { name: 'CAP', nuget: 'DotNetCore.CAP', desc: 'Lightweight event bus' },
    ],
    qa: [
      { question: 'Làm sao trace được flow khi dùng choreography?', answer: 'Dùng Correlation ID xuyên suốt tất cả events. Centralized logging (ELK, Seq) để query theo CorrelationId. Distributed tracing (Jaeger, Zipkin) để visualize flow.' },
      { question: 'Choreography có đảm bảo thứ tự events không?', answer: 'KHÔNG guarantee order giữa nhiều consumers. Nếu cần order -> dùng partition key (Kafka), hoặc sequential processing trong consumer, hoặc chuyển sang Orchestration.' },
      { question: 'Khi nào nên dùng Choreography thay vì Orchestration?', answer: 'Dùng cho: notification/analytics (side-effects), domain events broadcasting, extensibility (thêm consumer không sửa publisher). KHÔNG dùng cho: critical business flow cần compensating, flow phức tạp cần visibility.' },
      {
        question: 'Nếu 1 consumer trong choreography flow bị lỗi liên tục, có ảnh hưởng đến consumers khác không?',
        answer: 'KHÔNG ảnh hưởng nếu dùng separate queues: mỗi consumer có queue riêng -> fail độc lập. Nhưng CÓ vấn đề: (1) Event đã publish -> không thể "undo". (2) System inconsistent nếu 1 consumer fail vĩnh viễn. Giải pháp: (1) Dead letter queue + alert. (2) Compensating event (VD: OrderCancelledEvent). (3) Monitor consumer health. (4) Circuit breaker pattern.'
      },
      {
        question: 'Làm sao avoid cyclic dependencies trong choreography? VD: ServiceA publish EventX -> ServiceB consume và publish EventY -> ServiceA consume EventY?',
        answer: 'Anti-pattern phổ biến! Giải pháp: (1) Event naming convention: domain events vs integration events. (2) Event hierarchy: high-level events không trigger low-level events. (3) Bounded context design: rõ ràng ownership. (4) Event storming: visualize flow trước khi code. (5) Static analysis tools detect cycles. Best practice: nếu có cycle -> chuyển sang Orchestration.'
      },
      {
        question: 'Choreography có cách nào "rollback" khi flow fail giữa chừng không?',
        answer: 'KHÔNG có rollback tự động như Orchestration Saga. Phải manual design compensating events: (1) Publisher emit compensating event (VD: OrderCancelledEvent). (2) Các consumers tự handle compensate. (3) Eventually consistent rollback. Trade-off: phân tán logic compensating -> khó maintain. Best practice: choreography CHỈ cho non-critical flows hoặc idempotent operations.'
      },
      {
        question: 'Duplicate events trong choreography xử lý thế nào? VD: OrderCreatedEvent publish 2 lần do retry?',
        answer: 'Consumers PHẢI idempotent: (1) Inbox pattern: track processed MessageId. (2) Natural idempotency: unique constraint (VD: ProductId + OrderId). (3) Version vector. (4) At-least-once delivery + idempotency = effectively exactly-once. MassTransit/CAP có built-in duplicate detection. Best: design operations idempotent from the start (VD: SET thay vì INCREMENT).'
      },
      {
        question: 'Choreography scaling: nếu có 100 consumers subscribe cùng 1 event, performance ra sao?',
        answer: 'Message broker sẽ fan-out 100 copies -> overhead. Optimization: (1) RabbitMQ topic exchange efficient cho fan-out. (2) Kafka partition cho parallel consumption. (3) Async processing -> không block publisher. (4) Batch processing consumers. (5) Filter events ở consumer (đừng subscribe all rồi filter). Best: nếu >50 consumers cho 1 event -> cân nhắc redesign (có thể quá fine-grained).'
      },
    ],
  },

  // EVENT SOURCING
  {
    id: 'event-sourcing',
    problem: 'Order thay đổi trạng thái nhiều lần. Chỉ lưu state cuối -> mất lịch sử, không audit được, không replay được.',
    theory: [
      'Lưu MỌI EVENT đã xảy ra (append-only). State = replay events.',
      'Event immutable - không sửa/xóa. Muốn sửa -> thêm event mới.',
      'Snapshot để không phải replay từ đầu.',
      'Projection: event stream -> build read model.',
      'Trade-off: complexity cao, eventual consistency.',
    ],
    codeExamples: [
      {
        title: 'Event Sourcing với Marten',
        language: 'csharp',
        code: `// Events
public record OrderCreatedEvent(Guid OrderId, decimal Total);
public record StockReservedEvent(Guid OrderId);
public record PaymentCompletedEvent(Guid OrderId);

// Aggregate
public class OrderAggregate
{
    public Guid Id { get; private set; }
    public string Status { get; private set; }
    
    public void Apply(OrderCreatedEvent e)
    {
        Id = e.OrderId;
        Status = "Created";
    }
    
    public void Apply(StockReservedEvent e) => Status = "StockReserved";
}

// Usage
await session.Events.Append(orderId, new OrderCreatedEvent(orderId, 100m));
var order = await session.Events.AggregateStreamAsync<OrderAggregate>(orderId);`,
      },
    ],
    libraries: [
      { name: 'Marten', nuget: 'Marten', desc: 'Event Store trên PostgreSQL' },
      { name: 'EventStoreDB', nuget: 'EventStore.Client', desc: 'Specialized event database' },
    ],
    qa: [
      { question: 'Khi nào nên dùng Event Sourcing?', answer: 'Dùng khi: cần audit trail đầy đủ, temporal queries (state tại thời điểm X), replay để debug/test, domain phức tạp. KHÔNG dùng cho: CRUD đơn giản, reporting realtime (dùng projection), team chưa quen (learning curve cao).' },
      { question: 'Snapshot strategy như thế nào?', answer: 'Snapshot mỗi N events (VD: 50) hoặc theo thời gian. Trade-off: snapshot thường -> write overhead, snapshot ít -> read chậm. Async snapshot generation. Versioning cho snapshot khi aggregate logic thay đổi.' },
      { question: 'Migration event schema khi thay đổi business logic?', answer: 'Upcasting: đọc old event -> transform thành new format on-the-fly. Versioning events: OrderCreatedEventV2. Đừng sửa old events. Projection có thể handle nhiều versions.' },
      {
        question: 'Event Store bị corrupt hoặc mất data thì sao? Có backup strategy không?',
        answer: 'Critical vì events = source of truth! Backup strategy: (1) Continuous backup event store DB (PostgreSQL WAL, EventStoreDB backup). (2) Cross-region replication. (3) Periodic snapshot toàn bộ aggregates. (4) Event archive sang cold storage (S3). (5) Test restore procedure thường xuyên. Best practice: immutable events -> append-only -> backup dễ dàng hơn traditional DB.'
      },
      {
        question: 'Replay toàn bộ events từ đầu có khả thi khi có hàng triệu events không?',
        answer: 'KHÔNG khả thi cho production queries. Giải pháp: (1) Snapshot: chỉ replay từ snapshot gần nhất. (2) Projection/Read model: pre-computed state, không replay mỗi query. (3) CQRS: query từ read model, không từ event stream. (4) Event archiving: old events sang cold storage. (5) Parallel replay cho rebuild. Best: snapshot mỗi 100-500 events.'
      },
      {
        question: 'Làm sao delete/anonymize data trong Event Sourcing khi có GDPR "right to be forgotten"?',
        answer: 'Vấn đề nan giải vì events immutable! Giải pháp: (1) Crypto-shredding: encrypt PII với user-specific key -> delete key = data unreadable. (2) Tombstone events: "UserDataDeletedEvent" -> projection xóa PII. (3) Separate PII vào reference table -> delete table. (4) Event rewriting (LAST RESORT): rewrite event stream xóa PII -> break immutability. Best: crypto-shredding + projection update.'
      },
      {
        question: 'Concurrency conflicts trong Event Sourcing xử lý thế nào? VD: 2 users cùng update 1 order?',
        answer: 'Optimistic concurrency: (1) Track expected version khi append event. (2) Append thành công nếu version match. (3) Conflict -> reject và retry với new state. (4) Marten/EventStoreDB có built-in version check. Code: stream.AppendEvent(event, expectedVersion: 5) -> fail nếu current version != 5. Best: bounded context design tránh concurrent writes cùng aggregate.'
      },
      {
        question: 'Performance của Event Sourcing so với traditional CRUD? Khi nào ES chậm hơn?',
        answer: 'Write: ES nhanh hơn (append-only, no UPDATE). Read: ES chậm hơn nếu không có projection (phải replay). Trade-off: (1) ES + CQRS + projection -> read nhanh. (2) Snapshot giảm replay time. (3) Projection async -> eventual consistency. Chậm hơn khi: queries phức tạp realtime, không có projection, snapshot kém. Best: ES cho write-heavy + audit, traditional DB cho read-heavy simple CRUD.'
      },
    ],
  },

  // EVENTUAL CONSISTENCY
  {
    id: 'eventual-consistency',
    problem: 'OrderService lưu order -> publish event -> InventoryService reserve stock. Trong khoảng chờ, query stock thì data chưa consistent.',
    theory: [
      'CAP Theorem: chỉ chọn 2/3 (Consistency, Availability, Partition tolerance).',
      'Microservices chọn AP -> eventual consistency.',
      'Data SẼ consistent sau một khoảng thời gian.',
      'Window of inconsistency: khoảng thời gian chưa sync.',
      'UI/UX phải design cho inconsistency.',
    ],
    codeExamples: [
      {
        title: 'Polling for consistency',
        language: 'csharp',
        code: `[HttpPost("orders")]
public async Task<IActionResult> CreateOrder(CreateOrderRequest req)
{
    var order = new Order { Status = "Pending" };
    await _db.SaveChangesAsync();
    await _bus.Publish(new OrderCreatedEvent(order.Id));
    
    return Accepted(new { order.Id, order.Status });
}

[HttpGet("orders/{id}/status")]
public async Task<IActionResult> GetStatus(Guid id)
{
    var order = await _db.Orders.FindAsync(id);
    return Ok(new {
        Status = order.Status,
        IsFinalized = order.Status is "Completed" or "Failed"
    });
}`,
      },
    ],
    libraries: [
      { name: 'Polly', nuget: 'Polly', desc: 'Retry & resilience' },
      { name: 'CAP', nuget: 'DotNetCore.CAP', desc: 'Eventual consistency với outbox' },
    ],
    qa: [
      { question: 'Làm sao communicate eventual consistency với stakeholders?', answer: 'Giải thích trade-off: strong consistency -> lock -> chậm -> bad UX. Eventual -> fast response -> better UX. Đưa ra metrics: 99% consistent trong 2s. Demo UI pattern: loading states, optimistic updates.' },
      { question: 'Read-your-writes consistency trong eventual consistency system?', answer: 'Pattern: (1) Session stickiness -> đọc từ instance vừa write. (2) Version vector -> client track version, server check. (3) Write-through cache. (4) Return data ngay sau write thay vì query lại.' },
      { question: 'Compensating khi eventual consistency dẫn đến business rule violation?', answer: 'VD: overselling. Giải pháp: (1) Soft reservation với timeout. (2) Optimistic locking với version. (3) SAGA compensating: refund + notify. (4) Business rule: allow X% overselling. (5) Manual intervention workflow.' },
      {
        question: 'Window of inconsistency bao lâu là chấp nhận được? Làm sao measure?',
        answer: 'Phụ thuộc business: eCommerce (1-5s OK), banking (100ms critical), analytics (1 phút OK). Measure: (1) Track timestamp write event vs projection update. (2) P99 latency giữa services. (3) APM tools (New Relic, DataDog). (4) Custom metrics emit từ projection handlers. Best practice: SLA cho consistency window (VD: 99% < 3s), alert khi vi phạm.'
      },
      {
        question: 'Nếu 1 service bị lag, eventual consistency window kéo dài vô hạn thì xử lý sao?',
        answer: 'Circuit breaker + fallback: (1) Detect lag (message age > threshold). (2) Alert ops team. (3) Fallback: query từ eventual consistent copy hoặc return cached/stale data với disclaimer. (4) Auto-scaling consumer. (5) Dead letter queue cho failed messages. (6) Manual intervention nếu data critical. Worst case: compensating transaction sau khi fix.'
      },
      {
        question: 'Eventual consistency có thể dẫn đến race conditions không? VD: đọc data chưa consistent rồi quyết định sai?',
        answer: 'CÓ thể! VD: check stock (chưa trừ) -> đặt hàng -> overselling. Giải pháp: (1) Pessimistic locking cho critical operations (reserve stock trước). (2) Version-based optimistic locking (CAS - Compare-And-Swap). (3) Idempotency tokens. (4) Business rules cho phép inconsistency tạm thời (soft limits). (5) Saga compensating. Best: identify critical invariants -> enforce với locks/constraints.'
      },
      {
        question: 'Làm sao test eventual consistency? Test case nào quan trọng?',
        answer: 'Test scenarios: (1) Happy path: verify data eventually consistent (polling assertions). (2) Concurrent writes: race conditions. (3) Service failures: consumer down -> verify catch-up sau restart. (4) Network partition: split-brain scenarios. (5) Clock skew. Tools: (1) Chaos engineering (Chaos Monkey). (2) Testcontainers cho integration tests. (3) Time-based assertions với retries. (4) Contract testing cho events.'
      },
      {
        question: 'Eventual consistency + transactions: có thể có transaction span multiple services không?',
        answer: 'KHÔNG có distributed ACID transactions trong eventual consistency. Thay vào đó: (1) Saga pattern: local transactions + compensating. (2) 2PC (tránh trong microservices). (3) TCC (Try-Confirm-Cancel). Best practice: redesign để tránh cross-service transactions: (1) Merge services về cùng bounded context. (2) Accept eventual consistency. (3) Saga cho orchestration. Transaction chỉ trong service boundary.'
      },
    ],
  },

  // DISTRIBUTED TRANSACTION (2PC)
  {
    id: 'distributed-transaction',
    problem: 'Cần đảm bảo OrderDB và InventoryDB cùng commit/rollback. VD: chuyển tiền giữa 2 bank.',
    theory: [
      '2PC: Coordinator hỏi participants "ready?" -> tất cả OK thì commit.',
      'Phase 1 (Prepare): participants lock resource, trả lời READY/ABORT.',
      'Phase 2 (Commit/Rollback): coordinator ra lệnh COMMIT hoặc ROLLBACK.',
      'Nhược điểm: blocking, coordinator crash -> deadlock, không scale.',
      'Microservices hầu như KHÔNG dùng 2PC -> dùng Saga.',
    ],
    codeExamples: [
      {
        title: '2PC (anti-pattern)',
        language: 'csharp',
        code: `// using System.Transactions;
using (var scope = new TransactionScope())
{
    await _orderDb.SaveChangesAsync();
    await _inventoryDb.SaveChangesAsync();
    scope.Complete(); // LOCK cả 2 DB
}`,
      },
    ],
    libraries: [
      { name: 'System.Transactions', nuget: 'Built-in', desc: 'TransactionScope (cần DTC)' },
      { name: 'MassTransit Saga', nuget: 'MassTransit', desc: 'Alternative thay 2PC' },
    ],
    qa: [
      { question: 'Khi nào vẫn cần dùng 2PC trong microservices?', answer: 'Rất hiếm: (1) Financial system cần ACID strict. (2) Legacy integration bắt buộc. (3) 2 DB cùng 1 bounded context, cùng server. Best practice: tránh 2PC, redesign thành Saga hoặc merge services.' },
      { question: '3PC (Three-Phase Commit) có giải quyết được vấn đề 2PC không?', answer: '3PC thêm pre-commit phase -> giảm blocking window. Nhưng vẫn có vấn đề: network partition -> inconsistency. Complexity cao. Trong thực tế microservices KHÔNG dùng 3PC -> dùng Saga + eventual consistency.' },
      { question: 'XA transactions trong .NET Core có work không?', answer: 'XA = distributed transaction protocol. .NET Core KHÔNG support XA/DTC out-of-box (removed từ .NET Core 1.0). Workaround: (1) Dùng System.Transactions + MSDTC (Windows only). (2) Dùng database-specific solutions. (3) Best: Saga pattern.' },
      {
        question: 'Nếu coordinator crash giữa Phase 1 và Phase 2 của 2PC thì sao? Participants bị treo mãi mãi?',
        answer: 'Đây là vấn đề CHÍNH của 2PC! Participants ở trạng thái "prepared" -> locks held -> blocking. Giải pháp: (1) Coordinator recovery log: restart coordinator đọc log -> resume. (2) Timeout: participants timeout sau X phút -> rollback (nhưng có thể inconsistent). (3) Manual intervention. (4) Coordinator HA (high availability). Best: TRÁNH 2PC trong distributed systems.'
      },
      {
        question: '2PC blocking có ảnh hưởng đến throughput ra sao? Con số cụ thể?',
        answer: 'Blocking = disaster cho throughput: (1) Lock resources suốt 2 phases (có thể 100ms-1s). (2) Serialization: transactions chờ nhau. (3) Throughput giảm 10-100x so với local transactions. (4) Latency tăng linear theo số participants. Benchmark: 2PC với 3 services ~100 TPS, Saga ~10,000 TPS. Best: 2PC chỉ cho low-volume critical transactions.'
      },
      {
        question: 'Có alternative nào cho 2PC mà vẫn đảm bảo ACID không?',
        answer: 'Không có "silver bullet"! Alternatives: (1) Saga: ACD (thiếu I - Isolation). (2) TCC (Try-Confirm-Cancel): gần ACID nhưng phức tạp. (3) Merge services -> single DB transaction. (4) Event Sourcing + Projection. (5) Redesign business rules chấp nhận eventual consistency. Best: hiểu rằng CAP theorem -> không thể có CA + P trong distributed system.'
      },
      {
        question: 'Distributed deadlock trong 2PC xử lý thế nào?',
        answer: 'Deadlock xảy ra khi 2 transactions lock resources theo thứ tự khác nhau. Detection: (1) Timeout-based: rollback sau timeout. (2) Wait-for graph: detect cycles. Prevention: (1) Global lock ordering. (2) Deadlock timeout. (3) Wound-wait / Wait-die protocols. Best practice: 2PC + distributed deadlock = nightmare -> tránh 2PC.'
      },
      {
        question: 'Read-only participants trong 2PC có cần participate Phase 1 không? Optimization?',
        answer: 'Optimization: read-only participants có thể skip Phase 2 (không cần commit). Protocol: (1) Phase 1: read-only participant vote "READ" thay vì "YES". (2) Coordinator ghi nhận -> không gửi commit command cho participant này. (3) Giảm messages và locks. PostgreSQL, Oracle implement read-only optimization. Nhưng vẫn phải participate Phase 1 để verify consistency.'
      },
    ],
  },

  // EF CORE
  {
    id: 'ef-core',
    problem: 'Mỗi service cần tương tác DB riêng. Raw SQL repetitive, dễ lỗi, khó maintain.',
    theory: [
      'ORM: Map C# class ↔ DB table tự động.',
      'DbContext = unit of work, track changes.',
      'Migration: code-first, generate SQL tự động.',
      'AsNoTracking() cho read-only query.',
      'RowVersion cho optimistic concurrency.',
    ],
    codeExamples: [
      {
        title: 'DbContext & Repository',
        language: 'csharp',
        code: `public class OrderDbContext : DbContext
{
    public DbSet<Order> Orders => Set<Order>();
    
    protected override void OnModelCreating(ModelBuilder mb)
    {
        mb.Entity<Order>(e =>
        {
            e.HasKey(o => o.Id);
            e.Property(o => o.RowVersion).IsRowVersion();
        });
    }
}

// Usage
public async Task<OrderDto?> GetOrder(Guid id)
{
    return await _db.Orders
        .AsNoTracking()
        .Where(o => o.Id == id)
        .Select(o => new OrderDto { ... })
        .FirstOrDefaultAsync();
}`,
      },
    ],
    libraries: [
      { name: 'EF Core', nuget: 'Microsoft.EntityFrameworkCore', desc: 'Core ORM' },
      { name: 'Npgsql.EFCore', nuget: 'Npgsql.EntityFrameworkCore.PostgreSQL', desc: 'PostgreSQL provider' },
    ],
    qa: [
      { question: 'AsNoTracking vs Tracking khi nào dùng?', answer: 'AsNoTracking: read-only queries, performance tốt, không cần update. Tracking: khi cần update entity. Best practice: default AsNoTracking cho queries, chỉ track khi cần.' },
      { question: 'N+1 query problem và cách fix?', answer: 'Problem: load Order -> loop qua Items -> mỗi item query Product = N+1 queries. Fix: (1) Include() eager load. (2) Select() projection. (3) AsSplitQuery() cho collections lớn. (4) Detect bằng profiler.' },
      { question: 'Migration strategy trong microservices?', answer: 'Mỗi service quản lý migration riêng. CI/CD tự động apply migration. Backward compatible: add column nullable, remove column sau vài releases. Blue-green deployment cho breaking changes. Database-per-service pattern.' },
      {
        question: 'Global query filters vs explicit Where() - khi nào dùng gì?',
        answer: 'Global filters (HasQueryFilter): tự động apply cho mọi query (VD: soft delete, multi-tenancy). Pros: DRY, không quên filter. Cons: implicit magic, khó debug, có thể quên IgnoreQueryFilters(). Explicit Where(): rõ ràng, dễ debug. Best practice: global filter cho cross-cutting (soft delete, tenant), explicit cho business logic.'
      },
      {
        question: 'EF Core tracking vs identity map có gì khác biệt? Memory leak risk?',
        answer: 'Identity map: EF Core cache entities trong DbContext -> same ID = same instance. Tracking: monitor changes. Risk: long-lived DbContext -> memory leak (cache unbounded). Best: (1) DbContext per request (scoped lifetime). (2) AsNoTracking cho read-only. (3) DetachAll() sau bulk operations. (4) Dispose DbContext ngay sau dùng. NEVER singleton DbContext!'
      },
      {
        question: 'Compiled queries trong EF Core có worth không? Khi nào dùng?',
        answer: 'Compiled queries: pre-compile LINQ -> skip translation overhead mỗi lần. Performance gain: ~20-30% cho hot path queries. Dùng khi: (1) Query chạy nhiều lần (>1000/s). (2) Same structure, khác parameters. (3) Performance critical. Code: EF.CompileAsyncQuery((DbContext ctx, int id) => ctx.Orders.Where(...)). Trade-off: code verbose hơn. Best: measure first, optimize hot paths.'
      },
      {
        question: 'Lazy loading vs explicit loading vs eager loading - so sánh performance?',
        answer: 'Lazy: load khi access -> N+1 risk, convenient. Explicit: Load() on demand -> control, 1 extra query. Eager: Include() -> 1 query với JOIN hoặc multiple queries (AsSplitQuery). Performance: Eager fastest (1 query), Explicit OK (predictable), Lazy worst (N+1). Best: (1) Disable lazy loading globally. (2) Explicit Include() hoặc Select() projection. (3) AsSplitQuery() nếu cartesian explosion.'
      },
      {
        question: 'Concurrency conflicts: RowVersion vs ConcurrencyCheck - design decision?',
        answer: 'RowVersion: binary timestamp, auto-increment mỗi update, efficient. ConcurrencyCheck: check specific properties. Performance: RowVersion nhanh hơn (1 column vs N columns). Accuracy: ConcurrencyCheck chi tiết hơn (biết property nào conflict). Best practice: RowVersion default (simple, fast), ConcurrencyCheck khi cần granular conflict resolution. Handle DbUpdateConcurrencyException: reload + merge changes hoặc reject.'
      },
    ],
  },

  // MEDIATR
  {
    id: 'mediatr',
    problem: 'Controller -> validation -> business logic -> save -> publish event. Tất cả trong controller -> fat controller.',
    theory: [
      'Mediator: components gọi nhau qua mediator.',
      'CQRS natural: Command/Query -> Handler.',
      'Pipeline Behaviors: validation, logging, transaction.',
      'IRequest -> IRequestHandler: 1-to-1.',
      'INotification -> nhiều handlers: 1-to-many.',
    ],
    codeExamples: [
      {
        title: 'Command Handler & Pipeline',
        language: 'csharp',
        code: `// Command
public record CreateOrderCommand(string CustomerId, List<OrderItemDto> Items)
    : IRequest<Guid>;

// Handler
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, Guid>
{
    public async Task<Guid> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var order = new Order(cmd.CustomerId, cmd.Items);
        await _writeDb.SaveChangesAsync(ct);
        await _bus.Publish(new OrderCreatedEvent { ... });
        return order.Id;
    }
}

// Controller
[HttpPost]
public async Task<IActionResult> Create(CreateOrderRequest req)
    => Ok(await _mediator.Send(new CreateOrderCommand(req.CustomerId, req.Items)));`,
      },
    ],
    libraries: [
      { name: 'MediatR', nuget: 'MediatR', desc: 'Mediator pattern implementation' },
      { name: 'FluentValidation', nuget: 'FluentValidation', desc: 'Validation pipeline' },
    ],
    qa: [
      { question: 'MediatR có làm code phức tạp không cần thiết không?', answer: 'Trade-off: thêm abstraction layer -> nhiều files hơn. Nhưng: (1) Thin controllers. (2) Testable. (3) Pipeline behaviors reusable. (4) CQRS natural. Best: dùng cho medium-large projects, skip cho simple CRUD.' },
      { question: 'Performance overhead của MediatR?', answer: 'Minimal: chỉ là in-process mediator (không phải message bus). Overhead: reflection để resolve handler, pipeline execution. Benchmark: ~0.1ms overhead. Negligible so với I/O (DB, network). Source generators giảm reflection cost.' },
      { question: 'MediatR Notification vs domain events?', answer: 'MediatR Notification: in-process, synchronous (hoặc async nhưng cùng request). Domain events: raise trong aggregate, publish qua message bus. Best practice: domain events cho cross-service, MediatR notification cho in-process side-effects.' },
      {
        question: 'Pipeline behaviors execution order có quan trọng không? Làm sao control?',
        answer: 'CỰC KỲ quan trọng! Order: theo thứ tự registration. VD: Validation -> Logging -> Transaction -> Handler. Control: (1) AddTransient() order. (2) Generic constraints để force order. (3) Explicit ordering attribute (custom). Best practice: validation first, transaction wrapper last (innermost). Code review pipeline order!'
      },
      {
        question: 'Request vs Notification - khi nào dùng gì? Có thể mix không?',
        answer: 'Request (IRequest): 1-to-1, có return value, synchronous flow. Notification (INotification): 1-to-many, void return, fan-out. Mix: Handler publish Notification sau xử lý Request. VD: CreateOrderHandler -> publish OrderCreatedNotification -> multiple handlers (email, analytics). Best: Request cho commands/queries, Notification cho domain events in-process.'
      },
      {
        question: 'MediatR với dependency injection - scoped vs transient handlers?',
        answer: 'Handlers PHẢI scoped hoặc transient (KHÔNG singleton): (1) DbContext scoped -> handler inject DbContext phải scoped. (2) Singleton handler + scoped dependency = captive dependency bug. Best practice: handlers transient (default), dependencies scoped (DbContext). MediatR auto-resolve từ DI container. Warning: circular dependencies giữa handlers!'
      },
      {
        question: 'Unit testing với MediatR - mock IMediator hay test handlers directly?',
        answer: 'Hai approaches: (1) Integration test: real MediatR + in-memory dependencies -> test pipeline. (2) Unit test: test handler directly, mock dependencies -> fast, isolated. Best: combine cả hai. Unit test business logic trong handler, integration test pipeline behaviors. KHÔNG mock IMediator trong controllers (vô nghĩa) -> test handler thôi.'
      },
      {
        question: 'MediatR streaming requests (IStreamRequest) khi nào dùng? Use case?',
        answer: 'IStreamRequest: async enumerable results, không load hết vào memory. Use cases: (1) Large dataset pagination. (2) Real-time updates (SignalR streaming). (3) Export CSV/Excel chunked. (4) Log tailing. Code: IAsyncEnumerable<T>. Best: dùng cho data lớn không thể buffer, client consume progressive. Trade-off: complexity cao hơn, error handling khó hơn.'
      },
    ],
  },

  // AUTOMAPPER
  {
    id: 'automapper',
    problem: 'Map Order entity -> OrderDto, CreateOrderRequest -> Order. Viết tay repetitive.',
    theory: [
      'Convention-based mapping: property cùng tên tự động map.',
      'Profile: group mapping rules.',
      'ProjectTo() map ở SQL query level.',
      'ForMember() custom mapping.',
      'ReverseMap() bidirectional.',
    ],
    codeExamples: [
      {
        title: 'Mapping Profile',
        language: 'csharp',
        code: `public class OrderProfile : Profile
{
    public OrderProfile()
    {
        CreateMap<Order, OrderDto>()
            .ForMember(d => d.ItemCount, opt => opt.MapFrom(s => s.Items.Count));
            
        CreateMap<CreateOrderRequest, Order>()
            .ForMember(d => d.Id, opt => opt.MapFrom(_ => Guid.NewGuid()));
    }
}

// Usage
return await _db.Orders
    .ProjectTo<OrderDto>(_mapper.ConfigurationProvider)
    .FirstOrDefaultAsync();`,
      },
    ],
    libraries: [
      { name: 'AutoMapper', nuget: 'AutoMapper', desc: 'Object mapper' },
      { name: 'Mapster', nuget: 'Mapster', desc: 'Faster alternative' },
    ],
    qa: [
      { question: 'AutoMapper vs manual mapping performance?', answer: 'AutoMapper: reflection-based -> overhead. Mapster: code-gen -> gần bằng manual. Benchmark: AutoMapper ~2-3x chậm hơn manual, Mapster ~same. Trade-off: maintenance time vs runtime perf. Best: dùng ProjectTo() cho queries, cache mapping config.' },
      { question: 'Mapping nested objects có vấn đề gì?', answer: 'N+1 query nếu không Include(). Circular reference -> stack overflow. Deep copy overhead. Best practice: (1) ProjectTo() thay vì Map() cho queries. (2) Flatten DTO. (3) MaxDepth config. (4) Custom resolver cho complex mapping.' },
      { question: 'AutoMapper có nên dùng cho domain logic không?', answer: 'KHÔNG. AutoMapper for DTO/view models only. Domain logic dùng explicit mapping (factory methods, constructors). Lý do: domain mapping có business rules, validation. AutoMapper convention-based -> hide logic, khó test.' },
      {
        question: 'AutoMapper configuration validation - tại sao cần và làm sao enable?',
        answer: 'Validation detect misconfiguration lúc startup (missing mappings, unmapped properties). Enable: cfg.AssertConfigurationIsValid() hoặc app.Services.GetRequiredService<IMapper>().ConfigurationProvider.AssertConfigurationIsValid(). Best practice: LUÔN validate trong tests hoặc startup. Catch errors early thay vì runtime NullReferenceException.'
      },
      {
        question: 'ForMember vs ForPath - khi nào dùng gì?',
        answer: 'ForMember: map top-level property. ForPath: map nested property (VD: dto.CustomerName = src.Customer.Name). Syntax: ForPath(d => d.CustomerName, opt => opt.MapFrom(s => s.Customer.Name)). Dùng ForPath khi flatten nested objects. Best: prefer flattening (DTOs flat) over deep nesting để dễ maintain.'
      },
      {
        question: 'AutoMapper + EF Core ProjectTo() có work với Include() không?',
        answer: 'KHÔNG cần Include() khi dùng ProjectTo()! ProjectTo() tự generate SQL JOIN based on mapping config. VD: .ProjectTo<OrderDto>(_mapper.ConfigurationProvider) -> auto join Order.Items nếu OrderDto có ItemsDto. Lợi ích: (1) Chỉ SELECT columns cần. (2) No tracking overhead. (3) Single SQL query. Best: ProjectTo() > Map() cho queries.'
      },
      {
        question: 'ReverseMap() có pitsfall không?',
        answer: 'Có, nhất là với collection: ReverseMap không tự động mapping đúng (1-n, n-1). Giải pháp: (1) Explicit mapping cho collection. (2) Kiểm tra kỹ mapping config. Best practice: dùng ReverseMap cho DTO đơn giản, tránh cho complex objects.'
      },
    ],
  },

  // CACHING
  {
    id: 'caching',
    problem: 'Làm sao tăng tốc độ ứng dụng, giảm tải cho database?',
    theory: [
      'Cache dữ liệu tĩnh hoặc ít thay đổi gần đây (VD: product catalog, user sessions).',
      'Latency thấp hơn I/O đĩa.',
      'TTL (time-to-live) để tự động xóa cache cũ.',
      'Cache aside: ứng dụng tự quản lý cache.',
      'Write-through: cache và DB cùng lúc.',
    ],
    codeExamples: [
      {
        title: 'Sử dụng IMemoryCache',
        language: 'csharp',
        code: `public class ProductService
{
    private readonly IMemoryCache _cache;
    private readonly AppDbContext _db;
    
    public ProductService(IMemoryCache cache, AppDbContext db)
    {
        _cache = cache;
        _db = db;
    }
    
    public async Task<Product> GetProductAsync(int id)
    {
        // Try get from cache
        if (_cache.TryGetValue($"Product-{id}", out Product product))
            return product;
        
        // Not in cache, load from DB
        product = await _db.Products.FindAsync(id);
        
        // Set cache with TTL
        _cache.Set($"Product-{id}", product, TimeSpan.FromMinutes(5));
        
        return product;
    }
}`,
      },
    ],
    libraries: [
      { name: 'Microsoft.Extensions.Caching.Memory', nuget: 'Built-in', desc: 'In-memory caching' },
      { name: 'StackExchange.Redis', nuget: 'StackExchange.Redis', desc: 'Redis client' },
    ],
    qa: [
      { question: 'Cache invalidation strategies?', answer: '(1) TTL-based: simple, eventual consistency. (2) Event-based: publish InvalidateCache event khi update. (3) Write-through: update cache + DB cùng lúc. (4) Cache tags: invalidate group. Best: combine TTL + event-based.' },
      { question: 'Redis Cluster vs Sentinel?', answer: 'Sentinel: master-replica setup, automatic failover, đơn giản. Cluster: data sharding across nodes, horizontal scaling, phức tạp hơn. Best: Sentinel cho HA, Cluster cho large dataset cần shard.' },
      { question: 'Distributed lock với Redis có reliable không?', answer: 'Redlock algorithm: lock trên majority nodes. Trade-off: network partition -> false negatives (hai clients cùng lock). Martin Kleppmann critique: không safe trong mọi trường hợp. Best: dùng cho performance optimization (avoid duplicate work), KHÔNG dùng cho correctness (dùng DB unique constraint).' },
      {
        question: 'Redis persistence: RDB vs AOF - so sánh và chiến lược?',
        answer: 'RDB (snapshot): compact, fast restore, có thể mất data (last snapshot). AOF (append-only log): durable, slow restore, file lớn. Hybrid: RDB + AOF (best of both). Config: (1) save 900 1 (RDB mỗi 15p nếu >=1 key thay đổi). (2) appendfsync everysec (AOF mỗi giây). Best: RDB+AOF cho production, RDB-only cho cache không critical.'
      },
      {
        question: 'Redis pipelining vs transactions (MULTI/EXEC) - khác biệt?',
        answer: 'Pipelining: batch commands -> 1 network roundtrip, KHÔNG atomic. Transaction: MULTI...EXEC -> atomic, sequential. Performance: pipeline nhanh hơn (no isolation overhead). Use cases: pipeline cho bulk reads, transaction khi cần atomicity. Caveat: transaction KHÔNG rollback on error (chỉ abort nếu syntax error). Best: pipeline default, transaction khi cần atomic.'
      },
      {
        question: 'Redis eviction policies - LRU vs LFU vs TTL - chọn gì?',
        answer: 'Policies: (1) volatile-lru: evict LRU trong keys có TTL. (2) allkeys-lru: evict LRU global. (3) volatile-lfu: evict Least Frequently Used. (4) allkeys-random. Best: allkeys-lru cho cache (giữ hot data), volatile-ttl cho session store. Monitor evicted_keys metric. Set maxmemory + maxmemory-policy. LFU tốt hơn LRU cho access patterns không uniform.'
      },
      {
        question: 'Redis Pub/Sub vs Streams - khi nào dùng gì?',
        answer: 'Pub/Sub: fire-and-forget, no persistence, subscriber offline = mất message. Streams: persistent log (như Kafka), consumer groups, replay. Pub/Sub: realtime notifications, WebSocket fanout. Streams: event sourcing, durable messaging, at-least-once. Best: Pub/Sub cho ephemeral events, Streams cho critical messages. Migration path: start Pub/Sub -> Streams khi cần durability.'
      },
      {
        question: 'Redis memory optimization - techniques để giảm footprint?',
        answer: 'Techniques: (1) Hash fields thay vì separate keys (compact encoding). (2) Compression với MessagePack/Protobuf. (3) Expiration aggressive TTL. (4) Eviction policy. (5) redis-cli --bigkeys tìm keys lớn. (6) Avoid DEL lớn (dùng UNLINK async). (7) MEMORY DOCTOR command. Best: monitor memory_used_rss, aim <80% maxmemory.'
      },
    ],
  },

  // RABBITMQ
  {
    id: 'rabbitmq',
    problem: 'OrderService gửi message đến Inventory/Payment. HTTP trực tiếp -> service down mất request, không buffer, coupling chặt.',
    theory: [
      'Message Broker: decouple producer/consumer, buffer messages khi consumer offline.',
      'Exchange -> Binding -> Queue routing. Exchange types: Direct, Fanout, Topic, Headers.',
      'Queue lưu trữ message chờ consumer. Durable queue survive broker restart.',
      'ACK mechanism: consumer xử lý xong -> ACK -> broker xóa message. NACK -> requeue hoặc DLQ.',
      'Prefetch count: giới hạn số message gửi cho consumer cùng lúc, tránh overload.',
      'Dead Letter Queue (DLQ): message fail sau N retries -> chuyển vào DLQ để xử lý sau.',
    ],
    codeExamples: [
      {
        title: 'MassTransit + RabbitMQ Setup',
        language: 'csharp',
        code: `// DI Registration
services.AddMassTransit(x =>
{
    x.AddConsumers(typeof(Program).Assembly);
    x.UsingRabbitMq((context, cfg) =>
    {
        cfg.Host("rabbitmq://localhost", h =>
        {
            h.Username("guest");
            h.Password("guest");
        });
        cfg.UseMessageRetry(r => r.Intervals(1000, 5000, 15000));
        cfg.ConfigureEndpoints(context);
    });
});

// Producer
await _bus.Publish(new OrderCreatedEvent { OrderId = orderId });

// Consumer
public class ReserveStockConsumer : IConsumer<OrderCreatedEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedEvent> ctx)
    {
        await ReserveStock(ctx.Message.OrderId);
    }
}`,
      },
    ],
    libraries: [
      { name: 'MassTransit.RabbitMQ', nuget: 'MassTransit.RabbitMQ', desc: 'Transport layer cho MassTransit' },
      { name: 'RabbitMQ.Client', nuget: 'RabbitMQ.Client', desc: 'Low-level official .NET client' },
    ],
    qa: [
      { question: 'RabbitMQ vs Kafka khi nào dùng?', answer: 'RabbitMQ: complex routing, request-reply, priority queues, TTL, traditional messaging. Kafka: high throughput, event streaming, replay, log aggregation. Best: RabbitMQ cho microservices messaging, Kafka cho event streaming/analytics.' },
      { question: 'Prefetch count best practice?', answer: 'Prefetch = số messages gửi đồng thời cho 1 consumer. Low (1-10): fair distribution, slow processing OK. High (50-100): throughput cao, cần consumer xử lý nhanh. Best: start 10, tune theo CPU/memory.' },
      { question: 'Dead letter queue strategy?', answer: 'DLQ cho messages fail sau N retries. Best practice: (1) Separate DLQ per queue. (2) Alert khi DLQ có message. (3) Manual inspection/retry. (4) TTL trên DLQ. (5) Log context (exception, headers) vào DLQ message.' },
      { question: 'Message priority có thực sự work trong RabbitMQ không? Overhead?', answer: 'Priority queues WORK nhưng có trade-offs: (1) Declare queue x-max-priority (recommend 5-10). (2) Performance overhead ~10-20% vì sorting. (3) Starvation risk: low priority chờ mãi. Best: TRÁNH priorities, dùng separate queues cho critical vs normal traffic.' },
      { question: 'Publisher confirms vs transactions - so sánh?', answer: 'Publisher confirms: async ACK từ broker, throughput ~10K msg/s. Transactions: synchronous, blocking, ~1K msg/s. Best practice: LUÔN dùng publisher confirms. Confirms + persistent messages + mandatory flag = reliable delivery.' },
      { question: 'Auto-ack vs manual ack - rủi ro?', answer: 'Auto-ack: broker xóa message ngay khi gửi -> consumer crash = MẤT message. Manual ack: consumer explicit ACK sau khi process xong -> broker retry nếu crash. Best: LUÔN manual ack trong production. basicAck() after success, basicNack(requeue=true) on failure.' },
      { question: 'Quorum queues vs classic mirrored queues?', answer: 'Classic mirrored: DEPRECATED. Quorum queues: Raft-based replication, RECOMMENDED cho HA. Performance: quorum ~30% chậm hơn nhưng durable. Best: (1) Quorum cho critical data. (2) 3-5 node cluster (số lẻ). (3) Cross-AZ deployment.' },
    ],
  },

  // OPENAPI
  {
    id: 'openapi',
    problem: 'Làm sao mô tả API để dễ hiểu, dễ sử dụng?',
    theory: [
      'OpenAPI Spec: ngôn ngữ mô tả API RESTful.',
      'Swagger UI: tự động sinh tài liệu API từ spec.',
      'Code generation: sinh mã nguồn từ OpenAPI spec.',
      'Mock server: giả lập API phục vụ phát triển.',
    ],
    codeExamples: [
      {
        title: 'Định nghĩa OpenAPI spec',
        language: 'yaml',
        code: `openapi: 3.0.1
info:
  title: Product API
  description: API quản lý sản phẩm
  version: 1.0.0
servers:
  - url: http://localhost:5000
paths:
  /products:
    get:
      summary: Lấy danh sách sản phẩm
      responses:
        '200':
          description: Thành công
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'
components:
  schemas:
    Product:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        price:
          type: number
          format: float
        description:
          type: string`,
      },
    ],
    libraries: [
      { name: 'Swashbuckle', nuget: 'Swashbuckle.AspNetCore', desc: 'OpenAPI/Swagger cho ASP.NET Core' },
      { name: 'NSwag', nuget: 'NSwag.AspNetCore', desc: 'OpenAPI cho ASP.NET Core với nhiều tính năng nâng cao' },
    ],
    qa: [
      { question: 'OpenAPI là gì?', answer: 'OpenAPI là một chuẩn mô tả API RESTful, cho phép máy móc và con người dễ dàng hiểu và tương tác với một dịch vụ web mà không cần truy cập vào mã nguồn hoặc tài liệu bổ sung.' },
      { question: 'Làm sao để tự động sinh tài liệu API từ mã nguồn?', answer: 'Sử dụng các công cụ như Swagger hoặc NSwag, có thể tự động sinh tài liệu API từ các attribute trong mã nguồn (VD: [HttpGet], [Route("api/[controller]")] trong ASP.NET Core).' },
      { question: 'Có thể sử dụng OpenAPI cho gRPC không?', answer: 'Có, nhưng cần qua protoc-gen-openapi hoặc tương tự để chuyển đổi giữa OpenAPI và gRPC.' },
      {
        question: 'Mock server là gì? Tại sao cần thiết?',
        answer: 'Mock server giả lập hành vi của API thực tế, cho phép phát triển và thử nghiệm mà không cần phụ thuộc vào API thực sự. Giúp tiết kiệm thời gian và tăng tính độc lập trong phát triển phần mềm.'
      },
      {
        question: 'OpenAPI có hỗ trợ phiên bản không?',
        answer: 'Có, thông qua việc sử dụng tags và separate paths cho từng phiên bản. Ví dụ: /v1/products, /v2/products.'
      },
    ],
  },

  // REDIS
  {
    id: 'redis',
    problem: 'Product query mỗi request -> DB load cao. Cần cache sub-millisecond. Cần distributed lock cho concurrency control giữa nhiều instances.',
    theory: [
      'In-memory data store: sub-millisecond latency, dùng làm cache, session store, message broker.',
      'Data structures: String, Hash, List, Set, Sorted Set, Stream, HyperLogLog.',
      'Cache patterns: Cache-Aside (lazy load), Write-Through (đồng bộ), Write-Behind (bất đồng bộ).',
      'TTL (Time-to-Live): tự expire cache, tránh stale data.',
      'Distributed Lock: SETNX + TTL, Redlock algorithm cho multi-node.',
      'Pub/Sub vs Streams: Pub/Sub fire-and-forget, Streams persistent + consumer groups.',
    ],
    codeExamples: [
      {
        title: 'Cache-Aside Pattern + Distributed Lock',
        language: 'csharp',
        code: `// Cache-Aside
public async Task<ProductDto?> GetProduct(Guid id)
{
    var key = $"product:{id}";
    var cached = await _cache.GetStringAsync(key);
    if (cached != null)
        return JsonSerializer.Deserialize<ProductDto>(cached);

    var product = await _db.Products.FindAsync(id);
    if (product == null) return null;

    await _cache.SetStringAsync(key,
        JsonSerializer.Serialize(product),
        new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
        });
    return _mapper.Map<ProductDto>(product);
}

// Distributed Lock
await using var redLock = await _lockFactory.CreateLockAsync(
    $"lock:order:{orderId}",
    expiryTime: TimeSpan.FromSeconds(30),
    waitTime: TimeSpan.FromSeconds(10),
    retryTime: TimeSpan.FromMilliseconds(200));

if (redLock.IsAcquired)
{
    await ProcessOrder(orderId);
}`,
      },
    ],
    libraries: [
      { name: 'StackExchange.Redis', nuget: 'StackExchange.Redis', desc: 'High-performance Redis client' },
      { name: 'RedLock.net', nuget: 'RedLock.net', desc: 'Distributed lock (Redlock algorithm)' },
      { name: 'Microsoft.Extensions.Caching.StackExchangeRedis', nuget: 'Microsoft.Extensions.Caching.StackExchangeRedis', desc: 'IDistributedCache implementation' },
    ],
    qa: [
      { question: 'Cache invalidation strategies?', answer: '(1) TTL-based: đơn giản, eventual consistency. (2) Event-based: publish InvalidateCache event khi data thay đổi. (3) Write-through: update cache + DB cùng lúc. (4) Cache tags: invalidate nhóm related keys. Best: kết hợp TTL + event-based invalidation.' },
      { question: 'Redis Cluster vs Sentinel?', answer: 'Sentinel: master-replica setup, automatic failover, đơn giản. Cluster: data sharding across nodes, horizontal scaling, phức tạp hơn. Best: Sentinel cho HA (high availability), Cluster cho large dataset cần shard.' },
      { question: 'Distributed lock với Redis có reliable không?', answer: 'Redlock algorithm: lock trên majority nodes. Martin Kleppmann critique: network partition -> 2 clients cùng giữ lock. Best: dùng cho performance optimization (tránh duplicate work), KHÔNG dùng cho correctness-critical (dùng DB unique constraint thay thế).' },
      { question: 'RDB vs AOF persistence - chiến lược?', answer: 'RDB (snapshot): compact, restore nhanh, có thể mất data giữa 2 snapshots. AOF (append-only log): durable hơn, restore chậm, file lớn. Hybrid: RDB+AOF tốt nhất cả hai. Best: RDB+AOF cho production, RDB-only cho pure cache.' },
      { question: 'Redis eviction policies - LRU vs LFU?', answer: 'LRU: evict ít được truy cập gần đây nhất. LFU: evict ít được truy cập thường xuyên nhất. allkeys-lru cho general cache. volatile-ttl cho session store. LFU tốt hơn LRU khi access patterns không đều. Best: allkeys-lru mặc định, theo dõi evicted_keys metric.' },
      { question: 'Redis Pub/Sub vs Streams - khi nào dùng gì?', answer: 'Pub/Sub: fire-and-forget, không persistent, subscriber offline = mất message. Streams: persistent log (giống Kafka), consumer groups, replay được. Best: Pub/Sub cho ephemeral events (WebSocket fanout), Streams cho durable messaging cần at-least-once.' },
      { question: 'Redis memory optimization techniques?', answer: '(1) Hash fields thay vì separate keys. (2) Compression (MessagePack/Protobuf). (3) TTL tích cực. (4) UNLINK thay vì DEL cho large keys (xóa async). (5) redis-cli --bigkeys tìm keys lớn. (6) maxmemory + eviction policy. Best: giữ dưới 80% maxmemory.' },
    ],
  },

  // FILE STORAGE
  {
    id: 'file-storage',
    problem: 'Cần lưu trữ và phục hồi file (hình ảnh, tài liệu, video).',
    theory: [
      'Sử dụng Blob storage cho file lớn, ít thay đổi.',
      'Filesystem cho file nhỏ, thay đổi thường xuyên.',
      'Database cho file cần ACID, metadata phức tạp.',
      'Caching cho file truy cập nhiều lần, giảm độ trễ.',
    ],
    codeExamples: [
      {
        title: 'Lưu trữ file với Azure Blob Storage',
        language: 'csharp',
        code: `var blobServiceClient = new BlobServiceClient("<connection_string>");
var containerClient = blobServiceClient.GetBlobContainerClient("files");
await containerClient.CreateIfNotExistsAsync();

// Upload
var blobClient = containerClient.GetBlobClient("example.txt");
await blobClient.UploadAsync("localfile.txt", overwrite: true);

// Download
await blobClient.DownloadToAsync("downloadedfile.txt");`,
      },
    ],
    libraries: [
      { name: 'Azure.Storage.Blobs', nuget: 'Azure.Storage.Blobs', desc: 'Azure Blob Storage client library' },
      { name: 'Microsoft.AspNetCore.StaticFiles', nuget: 'Built-in', desc: 'Serve static files' },
    ],
    qa: [
      { question: 'Blob storage là gì?', answer: 'Là dịch vụ lưu trữ của Azure cho phép lưu trữ và truy cập dữ liệu không cấu trúc (như file hình ảnh, video, tài liệu) trên đám mây.' },
      { question: 'Làm sao để upload file lên Blob Storage?', answer: 'Sử dụng Azure Blob Storage client library. Tạo BlobServiceClient với connection string, sau đó gọi phương thức Upload trên đối tượng BlobClient.' },
      { question: 'Có giới hạn kích thước file nào khi upload lên Blob Storage không?', answer: 'Có, tối đa 256 TB cho mỗi blob. Tuy nhiên, với các file rất lớn, nên chia nhỏ thành các block blob để dễ quản lý và phục hồi.' },
      {
        question: 'Blob Storage có đảm bảo tính nhất quán của dữ liệu không?',
        answer: 'Có, Azure Blob Storage đảm bảo tính nhất quán cuối cùng cho dữ liệu. Có nghĩa là sau khi ghi dữ liệu, tất cả các yêu cầu đọc sau đó sẽ thấy dữ liệu đã được ghi.'
      },
      {
        question: 'Làm sao để phục hồi dữ liệu đã xóa trong Blob Storage?',
        answer: 'Sử dụng tính năng "soft delete" của Azure Blob Storage để phục hồi dữ liệu trong thời gian ngắn sau khi xóa. Hoặc phục hồi từ snapshot nếu đã tạo trước đó.'
      },
      {
        question: 'Có cách nào để giới hạn quyền truy cập vào file trong Blob Storage không?',
        answer: 'Có, thông qua Shared Access Signatures (SAS) để cấp quyền truy cập tạm thời và giới hạn cho các đối tượng cụ thể trong Blob Storage.'
      },
    ],
  },

  // SIGNALR
  {
    id: 'signalr',
    problem: 'Cần giao tiếp thời gian thực giữa server và client (VD: thông báo, cập nhật trạng thái).',
    theory: [
      'SignalR: thư viện của ASP.NET cho phép thêm tính năng real-time vào ứng dụng web.',
      'Hub: lớp trung gian giữa client và server, xử lý việc gửi/nhận message.',
      'Connection: mỗi client kết nối đến một Hub qua một connection ID duy nhất.',
      'Negotiate: quá trình thiết lập kết nối giữa client và server.',
    ],
    codeExamples: [
      {
        title: 'Tạo SignalR Hub cơ bản',
        language: 'csharp',
        code: `public class ChatHub : Hub
{
    public async Task SendMessage(string user, string message)
    {
        await Clients.All.SendAsync("ReceiveMessage", user, message);
    }
}

// Client-side (JavaScript)
// Kết nối đến Hub
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/chatHub")
    .build();

// Gửi message
connection.invoke("SendMessage", "user1", "Hello world!");

// Nhận message
connection.on("ReceiveMessage", (user, message) => {
    console.log(\`[\${user}]: \${message}\`);
});`,
      },
    ],
    libraries: [
      { name: 'Microsoft.AspNetCore.SignalR', nuget: 'Microsoft.AspNetCore.SignalR', desc: 'SignalR for ASP.NET Core' },
      { name: 'Microsoft.AspNetCore.SignalR.Client', nuget: 'Microsoft.AspNetCore.SignalR.Client', desc: 'SignalR client library' },
    ],
    qa: [
      { question: 'SignalR là gì?', answer: 'SignalR là một thư viện của ASP.NET giúp cho việc xây dựng các ứng dụng web có khả năng giao tiếp thời gian thực giữa server và client trở nên dễ dàng.' },
      { question: 'Hub trong SignalR là gì?', answer: 'Hub là một lớp trung gian giữa client và server, cho phép server gửi thông điệp đến một hoặc nhiều clients. Clients có thể gọi các phương thức trên Hub để gửi dữ liệu đến server.' },
      { question: 'Làm sao để cài đặt SignalR trong dự án ASP.NET Core?', answer: 'Sử dụng NuGet để cài đặt gói Microsoft.AspNetCore.SignalR. Sau đó, thêm dịch vụ SignalR vào phương thức ConfigureServices và cấu hình endpoint trong phương thức Configure của lớp Startup.' },
      {
        question: 'Có những phương thức nào để giao tiếp với SignalR Hub từ client?',
        answer: 'Các phương thức chính bao gồm: invoke (gọi phương thức trên Hub), on (đăng ký nhận thông báo từ Hub), start (bắt đầu kết nối đến Hub), stop (dừng kết nối).'
      },
      {
        question: 'Negotiation trong SignalR là gì?',
        answer: 'Negotiation là quá trình thiết lập kết nối giữa client và server. Client gửi yêu cầu đến server để bắt đầu quá trình kết nối, server sẽ phản hồi với các thông tin cần thiết để client hoàn tất việc kết nối.'
      },
      {
        question: 'SignalR có hỗ trợ xác thực và phân quyền không?',
        answer: 'Có, SignalR hỗ trợ xác thực thông qua ASP.NET Core Identity hoặc các phương thức xác thực khác. Phân quyền có thể được thực hiện thông qua chính sách hoặc role-based authorization.'
      },
    ],
  },

  // MQTT
  {
    id: 'mqtt',
    problem: 'Cần một giao thức nhẹ để giao tiếp giữa các thiết bị IoT.',
    theory: [
      'MQTT: giao thức nhắn tin nhẹ, sử dụng cho các thiết bị có tài nguyên hạn chế.',
      'Broker: trung tâm tiếp nhận và chuyển tiếp các tin nhắn giữa các client.',
      'Client: thiết bị hoặc ứng dụng gửi/nhận tin nhắn.',
      'Topic: kênh thông tin, client subscribe để nhận tin nhắn theo chủ đề.',
    ],
    codeExamples: [
      {
        title: 'Sử dụng MQTT với MQTTnet',
        language: 'csharp',
        code: `// Create a client instance
var factory = new Microsoft.Azure.Devices.Client.DeviceClientFactory();
var client = factory.Create("HostName=myIoTHub.azure-devices.net;DeviceId=myDeviceId;SharedAccessKey=mySharedAccessKey");

// Connect the device
await client.OpenAsync();

// Send messages
var message = new Message(Encoding.UTF8.GetBytes("Hello, MQTT"));
await client.SendEventAsync(message);

// Receive messages
client.SetReceiveMessageHandler(async (receivedMessage, token) =>
{
    var json = Encoding.UTF8.GetString(receivedMessage.Data);
    Console.WriteLine($"Received message: {json}");
    // Handle message
});
`,
      },
    ],
    libraries: [
      { name: 'MQTTnet', nuget: 'MQTTnet', desc: 'MQTT client and broker library' },
      { name: 'Microsoft.Azure.Devices.Client', nuget: 'Microsoft.Azure.Devices.Client', desc: 'Azure IoT Hub device SDK' },
    ],
    qa: [
      { question: 'MQTT là gì?', answer: 'MQTT (Message Queuing Telemetry Transport) là một giao thức nhắn tin nhẹ, thường được sử dụng trong các ứng dụng IoT để giao tiếp giữa các thiết bị có tài nguyên hạn chế.' },
      { question: 'Broker trong MQTT là gì?', answer: 'Broker là trung tâm tiếp nhận và chuyển tiếp các tin nhắn giữa các client trong hệ thống MQTT. Nó có trách nhiệm lưu trữ, định tuyến và phân phối các tin nhắn.' },
      { question: 'Client trong MQTT là gì?', answer: 'Client là bất kỳ thiết bị hoặc ứng dụng nào sử dụng giao thức MQTT để gửi hoặc nhận tin nhắn. Client có thể là cảm biến, bộ điều khiển, ứng dụng di động, v.v.' },
      {
        question: 'Topic trong MQTT là gì?',
        answer: 'Topic là một chuỗi ký tự dùng để phân loại và định tuyến các tin nhắn trong hệ thống MQTT. Các client subscribe vào một hoặc nhiều topic để nhận tin nhắn theo chủ đề đó.'
      },
      {
        question: 'Làm sao để cài đặt MQTTnet trong dự án .NET của tôi?',
        answer: 'Sử dụng NuGet để cài đặt gói MQTTnet. Sau đó, bạn có thể sử dụng các lớp và interface được cung cấp bởi MQTTnet để xây dựng ứng dụng của mình.'
      },
    ],
  },

  // OUTBOX
  {
    id: 'outbox',
    problem: 'Các sự kiện (events) có thể bị mất trong quá trình truyền tải giữa services.',
    theory: [
      'Outbox pattern: lưu sự kiện vào bảng "outbox" tạm thời trong cùng một transaction với thay đổi dữ liệu.',
      'Một service chỉ cần đọc sự kiện đã được đánh dấu là "ready" để gửi đi.',
      'Trade-off: tăng kích thước bảng, thêm logic xử lý lỗi.',
    ],
    codeExamples: [
      {
        title: 'Sử dụng Outbox với MassTransit',
        language: 'csharp',
        code: `public class Order
{
    public Guid Id { get; set; }
    public List<OrderItem> Items { get; set; }
}

public class OrderConsumer : IConsumer<Order>
{
    public async Task Consume(ConsumeContext<Order> context)
    {
        // Xử lý đơn hàng
        
        // Lưu sự kiện ra outbox
        await context.SaveChangesAsync();
    }
}`,
      },
    ],
    libraries: [
      { name: 'MassTransit', nuget: 'MassTransit', desc: 'Support for Outbox pattern' },
      { name: 'Entity Framework Core', nuget: 'Microsoft.EntityFrameworkCore', desc: 'ORM with dbContext' },
    ],
    qa: [
      { question: 'Polling vs CDC (Change Data Capture) cho Outbox?', answer: 'Polling: query DB định kỳ, simple, có lag. CDC (Debezium): stream DB log realtime, low latency, phức tạp. Best: start với polling (1-5s interval), CDC khi cần throughput cao (>1000 msg/s).' },
      { question: 'Outbox message ordering có đảm bảo không?', answer: 'Phụ thuộc implementation. MassTransit: order theo CreatedAt. Nhưng: parallel processing -> không guarantee strict order. Giải pháp: (1) Process sequential (chậm). (2) Partition by aggregate ID. (3) Business logic handle out-of-order.' },
      { question: 'Cleanup outbox messages strategy?', answer: 'Outbox table phình to nếu không cleanup. Best practice: (1) Soft delete (ProcessedAt). (2) Hard delete sau N ngày. (3) Archive sang cold storage (S3). (4) Partition table by date. (5) Monitor table size.' },
      {
        question: 'Outbox processor crash giữa chừng: message đã publish nhưng chưa mark ProcessedAt. Duplicate?',
        answer: 'ĐÚNG! At-least-once delivery risk. Scenario: (1) Publish event OK. (2) Crash trước SaveChanges(). (3) Restart -> republish. Solution: (1) Idempotency ở consumer (Inbox pattern). (2) Transaction: publish + mark trong same DB transaction (cần transactional outbox support). (3) MassTransit built-in outbox handle atomic. Best: LUÔN combine Outbox (producer) + Inbox (consumer).'
      },
      {
        question: 'Outbox polling interval: 100ms vs 5s - trade-offs?',
        answer: '100ms: low latency (~100ms), high DB load (10 queries/s). 5s: higher latency (~5s), lower DB load (0.2 queries/s). Sweet spot: 1-2s. Optimization: (1) Exponential backoff khi empty. (2) Batch processing (publish 100 msg cùng lúc). (3) Partition inbox table (shard by MessageId hash). (4) NoSQL inbox (Redis Set). (5) Time-window deduplication (chỉ check last 5 minutes). Benchmark: DB inbox ~1K msg/s, cached ~10K msg/s, Redis ~50K msg/s.'
      },
      {
        question: 'Multiple instances processing outbox concurrently -> duplicate processing?',
        answer: 'CÓ risk! Solutions: (1) Advisory locks (PostgreSQL): SELECT FOR UPDATE SKIP LOCKED. (2) Partition outbox by instance (modulo hash). (3) Distributed lock (Redis). (4) Optimistic locking (version field). (5) Idempotency ở consumer (ultimate defense). Best: SKIP LOCKED + idempotency. Code: SELECT * FROM Outbox WHERE ProcessedAt IS NULL FOR UPDATE SKIP LOCKED LIMIT 100.'
      },
      {
        question: 'Outbox với large payloads (VD: 1MB event) có vấn đề không?',
        answer: 'CÓ! Problems: (1) DB table bloat. (2) Query slow. (3) Serialization overhead. Solutions: (1) Store reference thay vì payload (event chứa OrderId, query details khi consume). (2) Compress payload (GZip). (3) Separate blob storage (S3) + reference. (4) Chunking events. Best practice: outbox messages < 10KB. Large data -> external storage + reference pattern.'
      },
      {
        question: 'Outbox + Saga: outbox cho internal events hay cả commands?',
        answer: 'CẢ HAI! Pattern: (1) Domain aggregate emit events -> outbox. (2) Saga state machine emit commands -> outbox (nếu dùng message bus). (3) External events vào inbox. Flow: Command -> Handler -> Aggregate -> Domain Event -> Outbox -> Bus -> Saga -> Command -> Outbox. MassTransit: tích hợp outbox cho both events & commands. Best: consistency toàn bộ messaging qua outbox.'
      },
    ],
  },

  // SAGA PATTERN
  {
    id: 'saga',
    problem: 'Order flow 3 bước: Reserve Stock -> Payment -> Shipment. Mỗi service DB riêng, không thể dùng 1 transaction. Payment fail -> cần rollback Stock đã reserve.',
    theory: [
      'Saga = chuỗi local transactions. Mỗi service xử lý 1 step với DB riêng.',
      'Fail -> compensating transactions chạy ngược lại (KHÔNG phải DB rollback, mà là business logic ngược).',
      'Compensating != rollback: tạo transaction mới để undo (VD: ReleaseStock, RefundPayment).',
      'Orchestration Saga: centralized coordinator biết toàn bộ flow.',
      'Choreography Saga: decentralized, mỗi service tự react với events.',
      'Saga state lưu persistent (DB/Redis) -> survive crash, restart tiếp tục.',
    ],
    codeExamples: [
      {
        title: 'MassTransit Saga State Machine với Compensations',
        language: 'csharp',
        code: `public class OrderSagaState : SagaStateMachineInstance
{
    public Guid CorrelationId { get; set; }
    public string CurrentState { get; set; }
    public Guid OrderId { get; set; }
    public decimal TotalAmount { get; set; }
}

public class OrderSaga : MassTransitStateMachine<OrderSagaState>
{
    public State StockReserving { get; private set; }
    public State PaymentProcessing { get; private set; }
    public State Completed { get; private set; }
    public State Failed { get; private set; }

    public Event<OrderCreatedEvent> OrderCreated { get; private set; }
    public Event<StockReservedEvent> StockReserved { get; private set; }
    public Event<PaymentCompletedEvent> PaymentCompleted { get; private set; }
    public Event<PaymentFailedEvent> PaymentFailed { get; private set; }

    public OrderSaga()
    {
        InstanceState(x => x.CurrentState);

        Initially(
            When(OrderCreated)
                .Then(ctx => ctx.Saga.OrderId = ctx.Message.OrderId)
                .Send(new Uri("queue:reserve-stock"),
                    ctx => new ReserveStockCommand(ctx.Saga.OrderId))
                .TransitionTo(StockReserving)
        );

        During(StockReserving,
            When(StockReserved)
                .Send(new Uri("queue:process-payment"),
                    ctx => new ProcessPaymentCommand(
                        ctx.Saga.OrderId, ctx.Saga.TotalAmount))
                .TransitionTo(PaymentProcessing)
        );

        During(PaymentProcessing,
            When(PaymentCompleted)
                .TransitionTo(Completed)
                .Finalize(),
            When(PaymentFailed)
                // COMPENSATE: giải phóng stock đã reserve
                .Send(new Uri("queue:release-stock"),
                    ctx => new ReleaseStockCommand(ctx.Saga.OrderId))
                .TransitionTo(Failed)
        );
    }
}`,
      },
    ],
    libraries: [
      { name: 'MassTransit', nuget: 'MassTransit', desc: 'Saga state machine framework' },
      { name: 'MassTransit.EntityFrameworkCore', nuget: 'MassTransit.EntityFrameworkCore', desc: 'Lưu saga state qua EF Core' },
      { name: 'NServiceBus', nuget: 'NServiceBus', desc: 'Enterprise saga support' },
    ],
    qa: [
      { question: 'ACD properties của Saga là gì? Thiếu gì so với ACID?', answer: 'Saga có: Atomicity (qua compensating), Consistency (eventual), Durability (persistent state). THIẾU: Isolation -> dirty reads, non-repeatable reads. Giải pháp: semantic lock, commutative updates, versioning.' },
      { question: 'Làm sao test Saga?', answer: '(1) Unit test: test state transitions riêng. (2) Integration test: in-memory broker, test harness (MassTransit.Testing). (3) Contract test: verify message schemas. (4) Chaos testing: kill services giữa flow. Tools: MassTransit test harness, Testcontainers.' },
      { question: 'Saga timeout strategy?', answer: 'Schedule timeout event khi bắt đầu step. Response về trước timeout -> cancel. Timeout fire -> compensate. Best practice: timeout = 2x expected latency + buffer. Cần idempotency để handle response đến SAU khi timeout đã fire.' },
      { question: 'Compensating transactions có idempotent không? Chạy 2 lần thì sao?', answer: 'Compensating PHẢI idempotent! VD: ReleaseStock chạy 2 lần không được trả stock 2 lần. Solutions: (1) Check state trước khi compensate (cờ IsReleased). (2) Idempotency key. (3) DB unique constraint. Best: thiết kế compensating tự nhiên idempotent (SET thay vì INCREMENT).' },
      { question: 'Saga isolation problem: dirty reads khi đang compensating?', answer: 'Vấn đề: Order đang compensate nhưng user thấy "Completed". Solutions: (1) Semantic lock: cờ "IsCompensating" trong Order. (2) Status progression: Pending -> Processing -> Completed. (3) Version field + optimistic locking. Best: semantic lock + status machine.' },
      { question: 'Nested/hierarchical sagas có khả thi không?', answer: 'KHẢ THI nhưng RẤT PHỨC TẠP! Parent saga gửi command -> child saga. Thách thức: compensating cascades, correlation tracking, deadlock risk, debug rất khó. Best practice: TRÁNH nested sagas. Flatten hierarchy hoặc refactor thành sequential steps.' },
      { question: 'Performance: Orchestration Saga vs Choreography Saga?', answer: 'Orchestration: thêm hop qua orchestrator (latency +10-50ms). Choreography: direct peer-to-peer (latency thấp hơn). Throughput: Choreography ~2x cao hơn. Nhưng: Choreography khó debug/trace. Best: chọn theo complexity vs performance needs.' },
    ],
  },

  // INBOX
  {
    id: 'inbox',
    problem: 'RabbitMQ at-least-once delivery -> message trùng lặp. Reserve stock 2 lần -> stock sai, payment charge 2 lần -> mất tiền.',
    theory: [
      'Message broker đảm bảo at-least-once -> CÓ THỂ gửi trùng message.',
      'Inbox pattern: theo dõi MessageId đã xử lý trong bảng InboxMessages.',
      'Flow: nhận message -> kiểm tra MessageId trong inbox -> trùng -> bỏ qua, mới -> xử lý + lưu inbox.',
      'Idempotency: xử lý N lần -> kết quả giống nhau như chỉ xử lý 1 lần.',
      'Check + Process + Save Inbox PHẢI CÙNG transaction để tránh race condition.',
      'At-least-once + Idempotency = effectively exactly-once từ góc nhìn business.',
    ],
    codeExamples: [
      {
        title: 'Inbox Pattern - Idempotent Consumer',
        language: 'csharp',
        code: `// Inbox entity
public class InboxMessage
{
    public Guid MessageId { get; set; }
    public string ConsumerType { get; set; }
    public DateTime ProcessedAt { get; set; }
}

// Idempotent consumer
public class ReserveStockConsumer : IConsumer<ReserveStockCommand>
{
    private readonly InventoryDbContext _db;

    public async Task Consume(ConsumeContext<ReserveStockCommand> ctx)
    {
        var messageId = ctx.MessageId
            ?? throw new InvalidOperationException("Missing MessageId");

        // Kiểm tra đã xử lý chưa
        var exists = await _db.InboxMessages
            .AnyAsync(m => m.MessageId == messageId
                && m.ConsumerType == nameof(ReserveStockConsumer));
        if (exists) return; // Bỏ qua message trùng!

        // Xử lý business logic
        var product = await _db.Products.FindAsync(ctx.Message.ProductId);
        product.Stock -= ctx.Message.Quantity;

        // Lưu inbox + business change CÙNG transaction
        _db.InboxMessages.Add(new InboxMessage
        {
            MessageId = messageId,
            ConsumerType = nameof(ReserveStockConsumer),
            ProcessedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(); // Atomic!
    }
}

// MassTransit built-in inbox (cách khác)
services.AddMassTransit(x =>
{
    x.AddEntityFrameworkOutbox<OrderDbContext>(o =>
    {
        o.UsePostgres();
        o.UseBusOutbox();    // Outbox cho publishing
        // Inbox tự động kích hoạt cho mỗi consumer
    });
});`,
      },
    ],
    libraries: [
      { name: 'MassTransit.EntityFrameworkCore', nuget: 'MassTransit.EntityFrameworkCore', desc: 'Built-in outbox + inbox support' },
      { name: 'CAP', nuget: 'DotNetCore.CAP', desc: 'Idempotent consumer support' },
    ],
    qa: [
      { question: 'Idempotency key nên dùng gì: MessageId hay business key?', answer: 'MessageId: unique cho mỗi message, đơn giản. Business key (OrderId + Action): handle retry với MessageId khác. Best: MessageId mặc định, business key khi cần cross-instance idempotency.' },
      { question: 'Inbox pattern có overhead performance không?', answer: 'CÓ: mỗi message thêm 1 query + 1 insert. Tối ưu: (1) In-memory cache recent MessageIds (Bloom filter/LRU). (2) Batch inserts. (3) Partition inbox table. (4) Index (MessageId, ConsumerType). Best: đo trước, cache cho hot paths.' },
      { question: 'Exactly-once delivery có tồn tại không?', answer: 'KHÔNG trong distributed systems (bất khả thi về mặt lý thuyết). At-least-once + Idempotency = effectively exactly-once từ góc nhìn business. Kafka "exactly-once" = idempotent producer + transactional consumer, KHÔNG phải true exactly-once.' },
      { question: 'Inbox cleanup: retention policy?', answer: 'Chiến lược: (1) TTL-based: xóa sau N ngày (VD: 30 ngày). (2) Partition theo ngày. (3) Archive data cũ. (4) Retention = max retry window + buffer. Best: index trên (MessageId, ProcessedAt), theo dõi table size, hard delete sau 7 ngày.' },
      { question: 'Consumer crash giữa chừng: đã xử lý business nhưng chưa lưu inbox?', answer: 'Race condition NGHIÊM TRỌNG! Solution: business logic + inbox insert PHẢI CÙNG transaction. Code: using var tx = BeginTransaction(); Process(); SaveInbox(); Commit(); MassTransit EF outbox xử lý atomic. KHÔNG ĐƯỢC tách riêng business tx vs inbox tx!' },
      { question: 'High-throughput consumers (10K msg/s): inbox có thành bottleneck không?', answer: 'CÓ THỂ nếu không tối ưu! Solutions: (1) Bloom filter / LRU cache cho recent MessageIds (99% cache hits). (2) Batch inserts (buffer 100 msgs -> bulk insert). (3) Partition inbox (shard theo MessageId hash). (4) Redis Set cho inbox. Benchmark: DB ~1K/s, cached ~10K/s, Redis ~50K/s.' },
      { question: 'Inbox + Saga: mỗi saga step cần inbox riêng hay dùng chung?', answer: 'RIÊNG cho mỗi consumer type! Lý do: (1) Cùng MessageId có thể được consume bởi nhiều consumers (fan-out). (2) Idempotency tính theo từng consumer. Schema: composite key (MessageId, ConsumerType). MassTransit: tự động xử lý per consumer. Best: tách riêng = rõ ràng + isolation.' },
    ],
  },

  // CQRS
  {
    id: 'cqrs',
    problem: 'OrderService vừa create/update (write-heavy) vừa query/search (read-heavy). Cùng model -> thoả hiệp cả hai, không optimize được cho bên nào.',
    theory: [
      'CQRS: tách Write model (Command) và Read model (Query) thành 2 paths riêng biệt.',
      'Command side: domain model phức tạp, validation, business rules.',
      'Query side: denormalized views, tối ưu cho read performance.',
      'Read model có thể nằm ở DB riêng (Elasticsearch, Redis, materialized views).',
      'Event Sourcing + CQRS: kết hợp tự nhiên, events build read models qua projections.',
      'Trade-off: complexity tăng, eventual consistency giữa write và read.',
    ],
    codeExamples: [
      {
        title: 'Command & Query Separation với MediatR',
        language: 'csharp',
        code: `// COMMAND (Write side)
public record CreateOrderCommand(string CustomerId, List<OrderItemDto> Items)
    : IRequest<Guid>;

public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, Guid>
{
    public async Task<Guid> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var order = Order.Create(cmd.CustomerId, cmd.Items);
        _writeDb.Orders.Add(order);
        await _writeDb.SaveChangesAsync(ct);
        await _bus.Publish(new OrderCreatedEvent
        {
            OrderId = order.Id,
            CustomerName = order.CustomerName,
            ItemsSummary = order.GetItemsSummary()
        });
        return order.Id;
    }
}

// QUERY (Read side - denormalized)
public record GetOrderQuery(Guid OrderId) : IRequest<OrderReadModel?>;

public class GetOrderHandler : IRequestHandler<GetOrderQuery, OrderReadModel?>
{
    public async Task<OrderReadModel?> Handle(GetOrderQuery q, CancellationToken ct)
    {
        return await _readDb.OrderReadModels
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrderId == q.OrderId, ct);
    }
}

// PROJECTION (Build read model từ events)
public class OrderProjection : IConsumer<OrderCreatedEvent>
{
    public async Task Consume(ConsumeContext<OrderCreatedEvent> ctx)
    {
        await _readDb.OrderReadModels.AddAsync(new OrderReadModel
        {
            OrderId = ctx.Message.OrderId,
            CustomerName = ctx.Message.CustomerName,
            ItemsSummary = ctx.Message.ItemsSummary,
            CreatedAt = DateTime.UtcNow
        });
        await _readDb.SaveChangesAsync();
    }
}`,
      },
    ],
    libraries: [
      { name: 'MediatR', nuget: 'MediatR', desc: 'Command/Query dispatch' },
      { name: 'Marten', nuget: 'Marten', desc: 'Event sourcing + projections trên PostgreSQL' },
      { name: 'EventStoreDB', nuget: 'EventStore.Client', desc: 'Specialized event database' },
    ],
    qa: [
      { question: 'Có nhất thiết phải separate DB cho CQRS không?', answer: 'KHÔNG. Có thể bắt đầu: (1) Cùng DB, separate tables. (2) Cùng DB, SQL views. (3) Separate DB khi cần scale. Best: bắt đầu đơn giản (same DB), mở rộng khi cần thiết.' },
      { question: 'Eventual consistency trong CQRS ảnh hưởng UX thế nào?', answer: 'User tạo order -> query ngay có thể chưa thấy. Giải pháp: (1) Optimistic UI: hiển thị ngay data vừa submit. (2) Polling/SignalR thông báo khi projection xong. (3) Trả data trong command response. (4) Session cache.' },
      { question: 'CQRS có phù hợp với mọi bounded context không?', answer: 'KHÔNG. Dùng khi: read/write patterns khác nhau rõ rệt, cần scale riêng, complex queries. KHÔNG dùng: simple CRUD, read/write cân bằng. Best: selective CQRS cho specific contexts.' },
      { question: 'Command validation nên đặt ở đâu?', answer: 'Hai layers: (1) Basic validation (required, format) -> MediatR pipeline behavior (FluentValidation). (2) Business validation (stock còn hàng, user có quyền) -> trong Command handler. KHÔNG duplicate validation logic giữa 2 layers!' },
      { question: 'Projection lag: user write xong thấy stale data?', answer: 'Giải pháp: (1) Projection SLA: 99% < 500ms. (2) Inline projection: update read model đồng bộ trong transaction (đánh đổi consistency vs perf). (3) Version-based queries. (4) Fallback đọc từ write model cho fresh reads. Best: đo lag, tối ưu projections.' },
      { question: 'Nhiều read models từ cùng event - maintain ra sao?', answer: 'Event-driven projections: 1 event -> N projections subscribe. Idempotent handlers. Theo dõi lag mỗi model. Rebuild: drop + replay events. Tools: Marten auto-projections, custom workers. Best: versioned events + projection rebuild pipeline.' },
      { question: 'Command idempotency: user submit form 2 lần?', answer: 'Giải pháp: (1) Client-side idempotency token (GUID) gửi cùng command. (2) Server check token trong bảng IdempotencyKeys. (3) Natural idempotency: unique constraint. (4) MediatR pipeline behavior kiểm tra token. Best: kết hợp token + unique constraints.' },
    ],
  },

    // REPOSITORY
  {
    id: 'repository',
    problem: 'Business logic dung DbContext truc tiep -> coupling chat vao EF Core, kho unit test, query logic lan man khap noi.',
    theory: [
      'Repository: abstraction layer giua domain va data access.',
      'IRepository<T> generic cho CRUD co ban.',
      'Specific repository (IOrderRepository) cho complex queries cua domain.',
      'Unit of Work: group nhieu operations -> 1 transaction (DbContext da la UoW).',
      'Specification pattern: composable, reusable query logic.',
      'Controversy: EF Core DbContext DA LA Repository + UoW, them layer = over-engineering?',
    ],
    codeExamples: [
      {
        title: 'Repository + Specification Pattern',
        language: 'csharp',
        code: `// Generic interface
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id);
    Task<List<T>> ListAsync(ISpecification<T> spec);
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
}

// Specific repository
public interface IOrderRepository : IRepository<Order>
{
    Task<List<Order>> GetPendingOrdersAsync();
    Task<Order?> GetWithItemsAsync(Guid id);
}

// Implementation
public class OrderRepository : IOrderRepository
{
    private readonly OrderDbContext _db;

    public async Task<Order?> GetByIdAsync(Guid id)
        => await _db.Orders.FindAsync(id);

    public async Task<List<Order>> GetPendingOrdersAsync()
        => await _db.Orders
            .Where(o => o.Status == OrderStatus.Pending)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

    public async Task<Order?> GetWithItemsAsync(Guid id)
        => await _db.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

    public async Task AddAsync(Order order)
    {
        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
    }
}

// Usage in handler
public class CreateOrderHandler : IRequestHandler<CreateOrderCommand, Guid>
{
    private readonly IOrderRepository _repo;

    public async Task<Guid> Handle(CreateOrderCommand cmd, CancellationToken ct)
    {
        var order = new Order(cmd.CustomerId, cmd.Items);
        await _repo.AddAsync(order);
        return order.Id;
    }
}`,
      },
    ],
    libraries: [
      { name: 'EF Core', nuget: 'Microsoft.EntityFrameworkCore', desc: 'DbContext = built-in repository + UoW' },
      { name: 'Ardalis.Specification', nuget: 'Ardalis.Specification', desc: 'Specification pattern library' },
    ],
    qa: [
      { question: 'Repository co phai over-engineering khong?', answer: 'Tranh cai: DbContext DA LA repository + unit of work. Them layer = abstraction khong can thiet. Nhung: (1) Testability (mock IRepo de hon DbContext). (2) Domain khong biet EF Core. (3) Encapsulate complex queries. Best: skip cho simple projects, dung cho DDD/complex domain.' },
      { question: 'Generic Repository vs Specific Repository?', answer: 'Generic: IRepository<T> cho CRUD don gian. Specific: IOrderRepository cho domain queries. Best: combine ca hai. Generic lam base, specific inherit + add domain methods. TRANH: leak IQueryable ra ngoai.' },
      { question: 'Repository co nen return IQueryable khong?', answer: 'KHONG. IQueryable leak EF Core vao domain, domain co the build query -> coupling. Best: repository return entities hoac DTOs. Dung Specification pattern cho composable queries thay vi IQueryable.' },
      { question: 'Specification pattern vs Repository methods?', answer: 'Repo methods: simple, explicit (GetActiveOrders()). Specification: composable, reusable (AndSpec, OrSpec). Best: repo methods cho 80% cases, Specification cho complex dynamic queries. Library: Ardalis.Specification.' },
      { question: 'Unit of Work co can voi EF Core khong?', answer: 'DbContext = built-in Unit of Work. Custom UoW can khi: coordinate multiple repos, explicit SaveChanges control. Pattern: IUnitOfWork { IOrderRepo Orders; SaveChanges(); }. Best: SKIP custom UoW cho simple apps.' },
      { question: 'Repository + CQRS: repo cho side nao?', answer: 'Command side: Repository phu hop (load aggregate, modify, save). Query side: KHONG can Repository (direct queries, projections, DTOs). Anti-pattern: repository cho read models. Best: Write -> Domain repo, Read -> query service.' },
      { question: 'Repository abstraction giup switch ORM (EF -> Dapper)?', answer: 'Giup NHUNG limited: interface khong doi, tests khong sua. Nhung: query semantics khac, transaction handling khac. Reality: hiem khi switch ORM. Best: KHONG design repository chi de "future-proof". Design theo domain needs.' },
    ],
  },
];

