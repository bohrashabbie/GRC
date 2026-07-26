"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { LookupById } from "@/components/lookup-by-id"
import { PageHeader } from "@/components/page-header"
import { RequirePermission } from "@/components/permission/require-permission"
import { RequireRoutePermission } from "@/components/permission/require-route-permission"
import { TransferCreateDialog } from "@/components/transfers/transfer-create-dialog"
import { PERMISSIONS } from "@/lib/permissions"
import { useRouter } from "@/i18n/navigation"

export default function TransfersPage() {
  return (
    <RequireRoutePermission permission={PERMISSIONS.stockTransfer}>
      <TransfersContent />
    </RequireRoutePermission>
  )
}

function TransfersContent() {
  const t = useTranslations("transfers")
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: t("title") }]} />
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          <RequirePermission permission={PERMISSIONS.stockTransfer}>
            <Button onClick={() => setCreateOpen(true)}>
              {t("newTransfer")}
            </Button>
          </RequirePermission>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <LookupById
            label={t("lookup")}
            placeholder={t("lookupPlaceholder")}
            hint={t("noListHint")}
            onOpen={(id) => router.push(`/transfers/${id}`)}
          />
        </CardContent>
      </Card>

      {createOpen && (
        <TransferCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(id) => router.push(`/transfers/${id}`)}
        />
      )}
    </div>
  )
}
