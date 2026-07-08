"use client";

import { useState, useRef, useEffect } from "react";
import { mercariApi } from "@/lib/api";

export function useMercariShipping(enabled: boolean, categoryId?: string) {
  const [mercariShipMethod, setMercariShipMethod] = useState<"SOYO" | "PREPAID">("SOYO");
  const [mercariWeightLb, setMercariWeightLb] = useState("");
  const [mercariWeightOz, setMercariWeightOz] = useState("");
  const [mercariDimL, setMercariDimL] = useState("");
  const [mercariDimW, setMercariDimW] = useState("");
  const [mercariDimH, setMercariDimH] = useState("");
  const [mercariShippingPayerId, setMercariShippingPayerId] = useState<1 | 2>(1);
  const [mercariSelectedCarrierId, setMercariSelectedCarrierId] = useState("");
  const [mercariSelectedCarrier, setMercariSelectedCarrier] = useState<any>(null);
  const [mercariCarriers, setMercariCarriers] = useState<any[]>([]);
  const [mercariCarriersLoading, setMercariCarriersLoading] = useState(false);
  const [mercariCarriersError, setMercariCarriersError] = useState<string | null>(null);
  const shippingFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || mercariShipMethod !== "PREPAID") return;
    if (shippingFetchRef.current) clearTimeout(shippingFetchRef.current);

    const lb = parseFloat(mercariWeightLb) || 0;
    const oz = parseFloat(mercariWeightOz) || 0;
    const totalOz = lb * 16 + oz;
    if (totalOz <= 0) {
      setMercariCarriers([]);
      return;
    }

    const dimL = parseFloat(mercariDimL) || 0;
    const dimW = parseFloat(mercariDimW) || 0;
    const dimH = parseFloat(mercariDimH) || 0;
    const hasDims = dimL > 0 && dimW > 0 && dimH > 0;

    setMercariCarriersError(null);
    shippingFetchRef.current = setTimeout(async () => {
      setMercariCarriersLoading(true);
      try {
        const res = await mercariApi.getShippingCarriers({
          ...(categoryId ? { categoryId: parseInt(categoryId, 10) } : {}),
          packageWeight: Math.round(totalOz),
          ...(hasDims ? { dimension: { length: dimL, width: dimW, height: dimH } } : {}),
        });
        const carriers = res?.data?.data?.availableShippingClassesV2?.shippingClasses ?? [];
        setMercariCarriers(Array.isArray(carriers) ? carriers : []);
      } catch (err: unknown) {
        setMercariCarriers([]);
        setMercariCarriersError(
          err instanceof Error ? err.message : "Failed to load carriers"
        );
      } finally {
        setMercariCarriersLoading(false);
      }
    }, 600);

    return () => {
      if (shippingFetchRef.current) clearTimeout(shippingFetchRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, mercariShipMethod, mercariWeightLb, mercariWeightOz, mercariDimL, mercariDimW, mercariDimH, categoryId]);

  function selectCarrier(carrier: any) {
    const id = String(carrier.id ?? "");
    if (mercariSelectedCarrierId === id) {
      setMercariSelectedCarrierId("");
      setMercariSelectedCarrier(null);
    } else {
      setMercariSelectedCarrierId(id);
      setMercariSelectedCarrier(carrier);
    }
  }

  function resetShipping() {
    setMercariShipMethod("SOYO");
    setMercariCarriers([]);
    setMercariSelectedCarrierId("");
    setMercariSelectedCarrier(null);
    setMercariCarriersError(null);
  }

  return {
    mercariShipMethod,
    setMercariShipMethod,
    mercariWeightLb,
    setMercariWeightLb,
    mercariWeightOz,
    setMercariWeightOz,
    mercariDimL,
    setMercariDimL,
    mercariDimW,
    setMercariDimW,
    mercariDimH,
    setMercariDimH,
    mercariShippingPayerId,
    setMercariShippingPayerId,
    mercariSelectedCarrierId,
    mercariSelectedCarrier,
    mercariCarriers,
    mercariCarriersLoading,
    mercariCarriersError,
    selectCarrier,
    resetShipping,
  };
}
