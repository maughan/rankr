"use client";

import React from "react";
import Link from "next/link";
import { formatDistance } from "date-fns";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { selectRankersByListId } from "@/lib/selectors";

export default function List(props: PageProps<"/lists/[id]">) {
  const { id } = React.use(props.params);
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.lists.lists[parseInt(id)]);
  const users = useAppSelector(selectRankersByListId(parseInt(id)));

  // const handleFilterByUser = (user: string) => {
  //   dispatch(filterRankingsByUser({ id, user }));
  // };

  return (
    <div className="p-16">
      <div className="flex justify-between align-center">
        <Link
          href="/lists"
          className="px-4 py-2 bg-white text-black rounded-sm"
        >{`< Back`}</Link>

        <Link
          href={`/lists/${id}/rank`}
          className="px-4 py-2 bg-orange-200 text-black rounded-sm"
        >
          Rank it
        </Link>
      </div>

      <br />

      {list ? (
        <>
          <p className="text-4xl font-bold">{list.metadata.title}</p>

          <p className="italic">{list.metadata.description}</p>

          <p className="text-xs flex gap-1">
            Created {formatDistance(list.metadata.createdAt, new Date())} by
            <p className="font-bold">{list.metadata.createdBy}</p>
          </p>

          <p className="text-xs">
            Last updated {formatDistance(list.metadata.updatedAt, new Date())}
          </p>

          <br />

          <div className="flex gap-4">
            {users.map((user) => (
              <div
                className="px-4 py-2 bg-white text-black rounded-md cursor-pointer"
                // onClick={}
              >
                {user}
              </div>
            ))}
          </div>

          <br />

          <div className="flex flex-col">
            {list.tiers.map((d) => (
              <div className="flex">
                <div
                  style={{ backgroundColor: d.metadata.color }}
                  className="text-black text-2xl font-bold p-4 min-w-16 min-h-16 flex justify-center items-center"
                >
                  {d.metadata.title}
                </div>
                <div className="flex flex-wrap">
                  {d.items
                    .map((item) => {
                      return list.items.find((it) => it.id === item);
                    })
                    .map((item) => (
                      <img src={item?.metadata.img} className="h-16 w-16" />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
