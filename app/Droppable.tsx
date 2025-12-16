import { useDroppable } from "@dnd-kit/core";

export default function Droppable(props) {
  const { isOver, setNodeRef } = useDroppable({
    id: props.id,
  });
  const style = {
    color: isOver ? "green" : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="min-h-16 w-full flex flex-wrap"
    >
      {props.children}
    </div>
  );
}
