"use client";

import { useEffect, useState } from "react";
import { IconRocket } from "@tabler/icons-react";
import { S } from "@/app/content/strings";

const MESSAGES = S.publish.loaderMessages;
const INTERVAL_MS = 1400;
const FADE_MS = 260;

export default function PublishingLoader() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % MESSAGES.length);
        setVisible(true);
      }, FADE_MS);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-rk-page flex flex-col items-center justify-center gap-5">
      <div
        className="w-14 h-14 rounded-[16px] flex items-center justify-center"
        style={{ backgroundColor: "#7C3AED20", border: "1px solid #7C3AED40" }}
      >
        <IconRocket
          size={28}
          style={{ color: "#7C3AED" }}
          className="[animation:rk-loader-pulse_1.2s_ease-in-out_infinite]"
        />
      </div>
      <p
        className="text-[15px] font-[500] text-rk-primary transition-opacity"
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease`,
          minHeight: "1.5em",
        }}
      >
        {MESSAGES[index]}
      </p>
    </div>
  );
}
