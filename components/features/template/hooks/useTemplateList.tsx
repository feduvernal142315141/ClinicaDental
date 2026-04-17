import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/contexts/auth-context";
import { ResponseGetAllCampaign } from "@/lib/entity/campaigns/campaigns";
import { useDebouncedState } from "@/lib/hooks/useDebouncedState";
import { Columns } from "@/components/ui/composed/table/TableModels";
import { FilterOperator } from "@/lib/models/filterOperator";
import { Badge } from "@/components/ui/atomic/data-display/badge";
import { Edit, Cog, Image, Trash2, Video } from "lucide-react";
import { serviceGetAllCampaignByClinicId } from "@/lib/services/campaigns/campaigns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/primitives/shadcn/dropdown-menu";
import { Button } from "@/components/ui/primitives/shadcn/button";
import { useRouter } from "next/navigation";

const useTemplateList = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [campaign, setCampaign] = useState<ResponseGetAllCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useDebouncedState("", 500);
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);

  const columns: Columns[] = useMemo(
    () => [
      {
        key: "name",
        title: "Nombre",
        className: "capitalize",
        filterable: true,
        filterOperator: FilterOperator.containsIgnoreCase,
        customCell: (value, row) => (
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">ID: {row.id}</div>
          </div>
        ),
      },
      {
        key: "statusName",
        title: "Estado",
        filterable: true,
        filterOperator: FilterOperator.contains,
        relatedField: "status.name",
        customCell: (value) => <Badge variant="secondary">{value}</Badge>,
      },
      {
        key: "resourceType",
        title: "Recurso",
        filterable: true,
        filterOperator: FilterOperator.containsIgnoreCase,
        customCell: (value) => (
          <div className="flex items-center">
            {value === "image" ? (
    // eslint-disable-next-line jsx-a11y/alt-text
              <Image className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
            <span className="ml-2 capitalize">{value}</span>
          </div>
        ),
      },
      {
        key: "id",
        title: "",
        customCell: (value) => (
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <Cog className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-50">
                <DropdownMenuItem
                  onClick={() => {
                    router.push(`/campaigns/edit/${value}`);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    router.push(`/campaign/edit/${value}`);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const loadData = useCallback(async () => {
    if (!user?.clinicId) return;

    try {
      setLoading(true);

      const queryToUse = { page, pageSize, filters: [filters] };
      const response = await serviceGetAllCampaignByClinicId(
        user.clinicId,
        queryToUse
      );

      if (response?.status === 200) {
        setTotal(response.data.pagination.total);
        setCampaign(response.data.entities);
      } else {
        setCampaign([]);
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
      setCampaign([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, user?.clinicId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onNewCampaign = async () => {
    router.push("/campaigns/create");
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(0);
  }, []);

  return {
    campaign,
    columns,
    total,
    pageSize,
    loading,
    setFilters,
    handlePageChange,
    handlePageSizeChange,
    onNewCampaign,
  };
};

export default useTemplateList;
