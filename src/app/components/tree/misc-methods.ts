

// Method to add a new node to the tree
// findNode(node: TodoItemNode, nodeId: string): TodoItemNode[] {
//   if (node.id === parseInt(nodeId)) {
//     return [node];
//   }
//   if (node.children) {
//     for (const child of node.children) {
//       const foundNode = this.findNode(child, nodeId);
//       if (foundNode.length > 0) {
//         return foundNode;
//       }
//     }
//   }
//   return [];
// }


          // addNodeToTree(parentId: number | undefined, newNode: TodoItemNode) {
          //   const updateChildren = (nodes: TodoItemNode[]): boolean => {
          //     for (const node of nodes) {
          //       if (node.id === parentId) {
          //         node.children.push(newNode);
          //         // Ensure the parent node is marked as expandable
          //         node.expandable = true;
          //         this.dataSource.data = [...this.dataSource.data]; // Trigger update
          //         this.treeControl.expand(this.treeControl.dataNodes.find(n => n.id === parentId) || this.treeControl.dataNodes[0]);
          //         return true;
          //       }
          //       if (updateChildren(node.children)) {
          //         return true;
          //       }
          //     }
          //     return false;
          //   };
          
          //   // Update tree data
          //   updateChildren(this._database.data);
          // }
  // removeNodeFromTree(nodeId: TodoItemFlatNode) {
  //   const removeNode = (nodes: TodoItemNode[]): boolean => {
  //     for (const node of nodes) {
  //       const index = node.children.findIndex(child => child.id === Number(nodeId));
  //       if (index !== -1) {
  //         node.children.splice(index, 1);
  //         if (node.children.length === 0) {
  //           node.expandable = false;
  //         }
  //         this.dataSource.data = [...this.dataSource.data]; // Trigger update
  //         return true;
  //       }
  //       if (removeNode(node.children)) {
  //         return true;
  //       }
  //     }
  //     return false;
  //   };

  //   // Update tree data
  //   removeNode(this._database.data);
  // }