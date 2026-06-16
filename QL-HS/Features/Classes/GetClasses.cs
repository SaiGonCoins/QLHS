using MediatR;
using Microsoft.EntityFrameworkCore;
using QL_HS.Data;
using QL_HS.Models;

namespace QL_HS.Features.Classes;

public record GetClassesQuery : IRequest<List<Class>>;

public class GetClassesQueryHandler(AppDbContext context) : IRequestHandler<GetClassesQuery, List<Class>>
{
    public async Task<List<Class>> Handle(GetClassesQuery request, CancellationToken cancellationToken)
    {
        return await context.Classes.AsNoTracking().ToListAsync(cancellationToken);
    }
}