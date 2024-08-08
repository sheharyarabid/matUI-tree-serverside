import { Component, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlattener, MatTreeFlatDataSource, MatTreeModule } from '@angular/material/tree';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CdkTreeModule } from '@angular/cdk/tree';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SelectionModel } from '@angular/cdk/collections';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';

export class TodoItemNode {
  children: TodoItemNode[] = [];
  item: string = '';
  id?: number; // Ensure ID is included
  expandable: boolean = false; // Add the 'expandable' property
  parent?: number;
}

export class TodoItemFlatNode {
  item: string = '';
  level: number = 0;
  expandable: boolean = false;
  id?: number; // Ensure ID is included
}
const apiUrl = 'http://localhost:1337/api/tree';
@Injectable()
export class ChecklistDatabase {

  dataChange = new BehaviorSubject<TodoItemNode[]>([]);

  constructor(private http: HttpClient) {
    this.initialize();
  }

  get data(): TodoItemNode[] {
    return this.dataChange.value;
  }

  initialize() {
    this.http.get<any>(`${apiUrl}/get`).subscribe(
      (response: any) => {
        try {
          const data = this.mapNodes(response);
          this.dataChange.next(data);
          console.log('Data source:', this.dataChange.value);
          
        } catch (error) {
          console.error('Error processing data:', error);
          this.dataChange.next([]);
        }
      },
      error => {
        console.error('Error fetching data:', error);
        this.dataChange.next([]);
      }
    );
  }

  mapNodes(nodes: any[]): TodoItemNode[] {
    const convertToTodoItemNode = (node: any): TodoItemNode => {
      const todoItemNode = new TodoItemNode();
      todoItemNode.item = node.node;
      todoItemNode.parent = node.parent;
      todoItemNode.id = node.id; // Ensure ID is correctly mapped
      todoItemNode.children = (node.children || []).map(convertToTodoItemNode);
      return todoItemNode;
    };
    return nodes.map(convertToTodoItemNode);
  }
}

@Component({
  selector: 'app-tree',
  templateUrl: 'tree.component.html',
  styleUrls: ['tree.component.scss'],
  providers: [ChecklistDatabase],
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatTreeModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    CdkTreeModule,
    ReactiveFormsModule,
    CommonModule,
    HttpClientModule,
    MatSelectModule
  ],
})
export class TreeComponent {
  flatNodeMap = new Map<TodoItemFlatNode, TodoItemNode>();
  nestedNodeMap = new Map<TodoItemNode, TodoItemFlatNode>();
  selectedParent: TodoItemFlatNode | null = null;
  nodeInput: { [key: string]: string } = {}; // Store input values for each node
  treeControl: FlatTreeControl<TodoItemFlatNode>;
  treeFlattener: MatTreeFlattener<TodoItemNode, TodoItemFlatNode>;
  dataSource: MatTreeFlatDataSource<TodoItemNode, TodoItemFlatNode>;
  checklistSelection = new SelectionModel<TodoItemFlatNode>(true /* multiple */);
  editingNode: TodoItemFlatNode | null = null;
  selectedNode: TodoItemFlatNode | null = null;
  isInputFieldVisible: boolean = false;
  toggleInputField() {
    this.isInputFieldVisible = !this.isInputFieldVisible;
  }

  constructor(private _database: ChecklistDatabase, private http: HttpClient,  private cdr: ChangeDetectorRef ) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
      
    );
    this.treeControl = new FlatTreeControl<TodoItemFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);
    
    
    _database.dataChange.subscribe(data => {
      this.dataSource.data = data;
      this.initializeNodeInputs(data); // Initialize input values when data changes
    });
  }

  initialize() {
    this.dataSource.data = [...this.dataSource.data];
    this._database.dataChange.next(this.dataSource.data);
    
  }

  selectNode(node: TodoItemFlatNode) {
    this.selectedNode = node;
  }

  getLevel = (node: TodoItemFlatNode) => node.level;

  isExpandable = (node: TodoItemFlatNode) => node.expandable;

  getChildren = (node: TodoItemNode): TodoItemNode[] => node.children;

  hasChild = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.expandable;

  hasNoContent = (_: number, _nodeData: TodoItemFlatNode) => _nodeData.item === '';

  transformer = (node: TodoItemNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item ? existingNode : new TodoItemFlatNode();
    flatNode.item = node.item;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    flatNode.id = node.id; // Map ID to flat node
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
   
    return flatNode;
  };

  createNode(node: TodoItemFlatNode) {
    const flatNode = this.flatNodeMap.get(node);
    const parent = flatNode;
    const parentId = parent?.id;
    const newValue = this.nodeInput[node.item] || ''; // Use the input value

    const payload = {
      node: newValue,
      parent: parentId
    };

    this.http.post(`${apiUrl}/create`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(
      (response: any) => {
        console.log('Node saved successfully:', response);
        const newNode: TodoItemNode = {
          item: newValue,
          id: response.id, // Assuming the response returns the new node ID
          children: [],
          expandable: false
        };

        // Update the tree data
        this.addNodeToTree(parentId, newNode);
        this.nodeInput[node.item] = ''; // Clear the input field after saving
      },
      error => {
        console.error('Error saving node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }

  addNodeToTree(parentId: number | undefined, newNode: TodoItemNode) {
    const updateChildren = (nodes: TodoItemNode[]): boolean => {
      for (const node of nodes) {
        if (node.id === parentId) {
          node.children.push(newNode);
          // Ensure the parent node is marked as expandable
          node.expandable = true;
          this.dataSource.data = [...this.dataSource.data]; // Trigger update
          this.treeControl.expand(this.treeControl.dataNodes.find(n => n.id === parentId) || this.treeControl.dataNodes[0]);
          return true;
        }
        if (updateChildren(node.children)) {
          return true;
        }
      }
      return false;
    };

    // Update tree data
    updateChildren(this._database.data);
  }

  getParentNode(node: TodoItemFlatNode): TodoItemFlatNode | null {
    const currentLevel = this.getLevel(node);
    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];
      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

 

  // Initialize node input values
  initializeNodeInputs(nodes: TodoItemNode[]) {
    const traverseNodes = (node: TodoItemNode) => {
      this.nodeInput[node.item] = ''; // Initialize input for each node
      node.children.forEach(traverseNodes);
    };

    nodes.forEach(traverseNodes);
  }
  findNode(node: TodoItemNode, nodeId: string): TodoItemNode[] {
    if (node.id === parseInt(nodeId)) {
      return [node];
    }
    if (node.children) {
      for (const child of node.children) {
        const foundNode = this.findNode(child, nodeId);
        if (foundNode.length > 0) {
          return foundNode;
        }
      }
    }
    return [];
  }
  
  findParentId(nodeId: any): void {
    const node = this.dataSource.data.flatMap(n => this.findNode(n, nodeId));
    const parentId = node.length > 0 ? node[0].parent : null;
    console.log('Parent ID:', parentId);
  }
  
  getChildIds(parentId: number): number[] {
    const findChildren = (nodes: TodoItemNode[], parentId: number): number[] => {
      for (const node of nodes) {
        if (node.id === parentId) {
          // Return the IDs of the children of the found parent node
          return node.children.map(child => child.id || -1).filter(id => id !== -1);
        }
        if (node.children) {
          const childIds = findChildren(node.children, parentId);
          if (childIds.length > 0) {
            return childIds;
          }
        }
      }
      return [];
    };

    return findChildren(this.dataSource.data, parentId);
  }
  getAllNodeIds(nodeID: any): number[] {
    
    const collectNodeIds = (nodes: TodoItemNode[], ids: number[]): void => {
      for (const node of nodes) {
        if (node.id !== undefined) {
          ids.push(node.id);
        }
        if (node.children) {
          collectNodeIds(node.children, ids);
        }
      }
    };

    const ids: number[] = [];

    collectNodeIds(this.dataSource.data, ids);
    console.log('Node IDs:', ids);
    const parentId : any = this.findParentId(nodeID);
    ids.splice(parentId, 1); //parent node removed from array of selectors
    const nodeIndex = ids.indexOf(nodeID);
    if (nodeIndex !== -1) {
      ids.splice(nodeIndex, 1); //current node removed from array of selectors
    }
   
    this.getChildIds(nodeID).forEach((childId) => {
    ids.splice(ids.indexOf(childId), this.getChildIds(nodeID).length);
    console.log('Child ID no:', this.getChildIds(nodeID).length);
    }); //child removed from array of selectors
    
    console.log('Node IDs:', ids);
    return ids;
  }
  
  deleteNode(nodeId: TodoItemFlatNode) {
    this.http.delete(`${apiUrl}/delete/${nodeId}`).subscribe(
      (response: any) => {
        console.log('Node deleted successfully:', response);
        this.removeNodeFromTree(nodeId);
      },
      error => {
        console.error('Error deleting node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }

  removeNodeFromTree(nodeId: TodoItemFlatNode) {
    const removeNode = (nodes: TodoItemNode[]): boolean => {
      for (const node of nodes) {
        const index = node.children.findIndex(child => child.id === Number(nodeId));
        if (index !== -1) {
          node.children.splice(index, 1);
          if (node.children.length === 0) {
            node.expandable = false;
          }
          this.dataSource.data = [...this.dataSource.data]; // Trigger update
          return true;
        }
        if (removeNode(node.children)) {
          return true;
        }
      }
      return false;
    };

    // Update tree data
    removeNode(this._database.data);
  }

  editNode(node: TodoItemFlatNode) {
    const flatNode = this.flatNodeMap.get(node);
    if (!flatNode) {
      console.error('FlatNode not found');
      return;
    }
    const parentId = Number(this.nodeInput[node.id || '']);
    const newValue = this.nodeInput[node.item] || '';
  
    // Ensure that the node ID and parent ID are defined
    if (!node.id || isNaN(parentId)) {
      console.error('Node ID or Parent ID is not defined');
      return;
    }
  
    const payload = {
      node: newValue,
      parent: parentId
    };
  
    this.http.patch(`${apiUrl}/update/${node.id}`, payload, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe(
      (response: any) => {
        console.log('Node updated successfully:', response);
  
        // Find the updated node in the tree and update its data
        const updateNode = (nodes: TodoItemNode[]): boolean => {
          for (const node of nodes) {
            if (node.id === response.id) {
              node.item = newValue; // Update the item value
              node.parent = response.parentId; // Update the parent ID with the response
              this.dataSource.data = [...this.dataSource.data];  
              this._database.dataChange.next([...this.dataSource.data]);
              this.treeControl.dataNodes = [...this.treeControl.dataNodes];
              console.log('Data source:', this.dataSource.data);
              this.cdr.detectChanges();
              this._database.initialize();
              return true;
            }
            if (updateNode(node.children)) {
              return true;
            }
          }
          return false;
        };
  
        // Update the tree data
        updateNode(this._database.data);
        this.nodeInput[node.item] = ''; // Clear the input field after saving
        if (node.id) {
          this.nodeInput[node.id] = ''; // Clear the parent input field after saving
        }
      },
      error => {
        console.error('Error updating node:', error.message);
        console.error('Response body:', error.error);
      }
    );
  }
}