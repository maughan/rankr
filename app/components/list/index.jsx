export default function List({ tierData, items, list }) {
  return (
    <>
      <div className="flex flex-col">
        {data.map((d) => {
          if (d.value === 0) return null;
          return (
            <div className="flex">
              <div
                style={{ backgroundColor: d.color }}
                className="text-black text-2xl font-bold p-4 min-w-20 min-h-20 flex justify-center items-center"
              >
                {d.title}
              </div>
              <div className="flex flex-wrap">
                {d.items
                  .map((item) => {
                    return list.items.find((it) => it.id === item);
                  })
                  .map((item) =>
                    item ? (
                      <div
                        className="h-20 w-20 relative"
                        onPointerUp={() => handlePointerUp(item.img)}
                      >
                        <Image
                          loader={ImageKitLoader}
                          id={item.title}
                          src={item.img}
                          alt={d.title}
                          sizes="64px"
                          fill
                          priority
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                    ) : null
                  )}
              </div>
            </div>
          );
        })}
      </div>

      <br />

      <div className="w-full min-h-20 flex flex-wrap">
        {items.map((item) => {
          const isRanked = list.tiers.find((tier) =>
            tier.items.includes(item.id)
          );

          if (isRanked) return null;

          return (
            <div
              className="w-20 h-20 relative"
              onPointerUp={() => handlePointerUp(item.img)}
            >
              <Image
                loader={ImageKitLoader}
                src={item.img}
                alt={item.title}
                style={{ objectFit: "cover" }}
                fill
                priority
                sizes="64px"
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
