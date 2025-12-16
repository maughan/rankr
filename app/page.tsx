// "use client";

// import {
//   createList,
//   clearLists,
//   closeCreateListModal,
//   openCreateListModal,
//   updateListMeta,
//   updateListPayload,
//   openCreateTierModal,
//   updateTierPayload,
//   closeCreateTierModal,
//   createTier,
//   updateTierMeta,
//   openCreateItemModal,
//   closeCreateItemModal,
//   updateItemPayload,
//   updateItemMeta,
//   populateData,
//   handleDropItem,
// } from "@/lib/features/lists/listsSlice";
// import { useAppDispatch, useAppSelector } from "@/lib/hooks";
// import { DndContext } from "@dnd-kit/core";
// import { useState } from "react";
// import Droppable from "./Droppable";
// import Draggable from "./Draggable";

// export default function Home() {
//   const [parent, setParent] = useState(null);
//   const [positions, setPositions] = useState({
//     S: [],
//     A: [],
//     B: [],
//     C: [],
//     D: [],
//     E: [],
//     F: [],
//     BASE: [],
//   });
//   const [options, setOptions] = useState([]);
//   const dispatch = useAppDispatch();
//   const lists = useAppSelector((state) => state.lists);
//   const modals = useAppSelector((state) => state.lists.modals);
//   console.log("STATE", positions);

//   const handleShowCreateModal = () => {
//     dispatch(openCreateListModal());
//   };

//   const handleCloseCreateModal = () => {
//     dispatch(closeCreateListModal());
//   };

//   const handleAddList = () => {
//     dispatch(createList());
//   };

//   const handleClearLists = () => {
//     dispatch(clearLists());
//   };

//   const handleShowTierModal = () => {
//     dispatch(openCreateTierModal());
//   };

//   const handleCloseTierModal = () => {
//     dispatch(closeCreateTierModal());
//   };

//   const handleShowItemModal = () => {
//     dispatch(openCreateItemModal());
//   };

//   const handleCloseItemModal = () => {
//     dispatch(closeCreateItemModal());
//   };

//   const handleAddTier = () => {
//     dispatch(createTier());
//   };

//   const popData = () => {
//     dispatch(populateData());
//   };

//   const handleListOnChange = (key: keyof updateListPayload, value: string) => {
//     dispatch(
//       updateListMeta({
//         [key]: value,
//       })
//     );
//   };

//   const handleTierOnChange = (key: keyof updateTierPayload, value: string) => {
//     dispatch(
//       updateTierMeta({
//         [key]: value,
//       })
//     );
//   };

//   return (
//     <div className="flex flex-col min-h-screen items-center justify-center bg-white font-sans dark:bg-white p-16">
//       <button onClick={popData}>Load data</button>

//       {modals.createList ? (
//         <>
//           <div className="absolute z-998 bg-black inset-0 opacity-80" />

//           <div className="absolute z-999 place-self-center bg-white w-fit h-fit p-4 rounded-sm text-black">
//             <p className="text-2xl">Create list</p>

//             <p>List name</p>

//             <input
//               value={lists.list.title}
//               onChange={(e) => handleListOnChange("title", e.target.value)}
//             />

//             <p>Description</p>

//             <input
//               value={lists.list.description}
//               onChange={(e) =>
//                 handleListOnChange("description", e.target.value)
//               }
//             />

//             <div className="flex justify-between">
//               <button onClick={handleCloseCreateModal}>Close</button>

//               <button onClick={handleAddList}>Save</button>
//             </div>
//           </div>
//         </>
//       ) : null}

//       {modals.createTier ? (
//         <>
//           <div className="absolute z-998 bg-black inset-0 opacity-80" />

//           <div className="absolute z-999 place-self-center bg-white w-fit h-fit p-4 rounded-sm text-black">
//             <p className="text-2xl">Create tier</p>

//             <p>Tier name</p>

//             <input
//               value={lists.tier.title}
//               onChange={(e) => handleTierOnChange("title", e.target.value)}
//             />

//             <p>Description</p>

//             <input
//               value={lists.tier.color}
//               onChange={(e) => handleTierOnChange("color", e.target.value)}
//             />

//             <p>Value</p>

//             <input
//               value={lists.tier.value}
//               type="number"
//               onChange={(e) => handleTierOnChange("value", e.target.value)}
//             />

//             <div className="flex justify-between">
//               <button onClick={handleCloseTierModal}>Close</button>

//               <button onClick={handleAddTier}>Save</button>
//             </div>
//           </div>
//         </>
//       ) : null}
//     </div>
//   );
// }
