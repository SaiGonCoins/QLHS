using MongoDB.Driver;
using QL_HS.Models;

namespace QL_HS.Services;

// =====================================================================
// AuditService: Triển khai ghi log vào MongoDB collection "AuditLogs".
// - Inject IMongoDatabase (đăng ký singleton trong Program.cs).
// - InsertLogAsync enqueue log lên ThreadPool bằng Task.Run để đảm bảo
//   API chính trả response ngay lập tức (không chờ round-trip tới MongoDB).
// - Mọi exception trong background đều được nuốt + log ra console, tránh
//   làm crash process (audit log không được phép ảnh hưởng nghiệp vụ chính).
// =====================================================================

public class AuditService(IMongoDatabase database, ILogger<AuditService> logger) : IAuditService
{
    // Collection lưu trữ audit log — đặt tên "AuditLogs"
    private readonly IMongoCollection<AuditLog> _collection =
        database.GetCollection<AuditLog>("AuditLogs");

    static AuditService()
    {
        // Bắt mọi unobserved exception từ background task
        TaskScheduler.UnobservedTaskException += (sender, args) =>
        {
            Console.WriteLine($"[UNOBSERVED-TASK-EXCEPTION] {args.Exception}");
            args.SetObserved();
        };
    }

    public Task InsertLogAsync(AuditLog log)
    {
        logger.LogInformation("[AUDIT-DEBUG] AuditService.InsertLogAsync ENTERED for Action={Action}", log.ActionName);

        // -----------------------------------------------------------
        // Fire-and-forget: đẩy toàn bộ thao tác I/O xuống ThreadPool
        // -----------------------------------------------------------
        // Lưu ý: dùng Task.Run kèm Wait() ở background để bắt exception
        _ = Task.Run(async () =>
        {
            try
            {
                var dbName = _collection.Database.DatabaseNamespace.DatabaseName;
                var collName = _collection.CollectionNamespace.CollectionName;
                logger.LogInformation("[AUDIT-DEBUG] Target DB={Db} Coll={Coll}", dbName, collName);

                // List collections in target DB
                var collections = await _collection.Database.ListCollectionNames().ToListAsync();
                logger.LogInformation("[AUDIT-DEBUG] Existing collections in {Db}: [{List}]",
                    dbName, string.Join(", ", collections));

                log.Timestamp = DateTime.UtcNow;
                await _collection.InsertOneAsync(log);
                logger.LogInformation("[AUDIT-DEBUG] InsertOneAsync RETURNED OK for {Action}", log.ActionName);

                // VERIFY: count documents trực tiếp từ driver
                var count = await _collection.CountDocumentsAsync(FilterDefinition<AuditLog>.Empty);
                logger.LogInformation("[AUDIT-DEBUG] CountDocumentsAsync returned: {Count}", count);

                // VERIFY: list databases từ driver
                var dbs = await _collection.Database.Client.ListDatabaseNames().ToListAsync();
                logger.LogInformation("[AUDIT-DEBUG] All databases visible to driver: [{List}]",
                    string.Join(", ", dbs));

                // VERIFY: list collections in ql_hocsinh
                var db2 = _collection.Database.Client.GetDatabase(dbName);
                var colls2 = await db2.ListCollectionNames().ToListAsync();
                logger.LogInformation("[AUDIT-DEBUG] Colls in {Db} (via client): [{List}]",
                    dbName, string.Join(", ", colls2));
            }
            catch (Exception ex)
            {
                logger.LogError(ex,
                    "Không thể ghi AuditLog vào MongoDB. Action={ActionName} Entity={EntityName} Id={EntityId}",
                    log.ActionName,
                    log.TargetEntity.EntityName,
                    log.TargetEntity.EntityId);
                Console.WriteLine($"[AUDIT-CONSOLE-ERROR] {ex}");
            }
        });

        return Task.CompletedTask;
    }
    public async Task<List<AuditLog>> GetAllLogsAsync()
    {
        return await _collection
            .Find(_ => true)
            .SortByDescending(l => l.Timestamp)
            .ToListAsync();
    }
}
